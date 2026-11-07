import { ZipWriter } from "@zip.js/zip.js/lib/zip-core-writer.js";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { fetchExportPage, fetchExportPageIds } from "../_db/queries";
import {
	exportImageFilename,
	getExportImageKey,
	getExportImageUrls,
	serializeExportPage,
} from "../_domain/export-document";
import { readExportImage } from "../_infra/read-image";

/** 文書と画像を1件ずつ読み、ダウンロードの速度に合わせてZIPへ流す。 */
export async function createPagesExport(
	userId: string,
	origin: string,
	signal: AbortSignal,
) {
	const pages = await fetchExportPageIds(userId);
	let outputController: TransformStreamDefaultController<Uint8Array>;
	const stream = new TransformStream<Uint8Array, Uint8Array>({
		start(controller) {
			outputController = controller;
		},
	});
	const zip = new ZipWriter(stream.writable, {
		level: 0,
		useWebWorkers: false,
	});
	const imageHost = process.env.CF_IMAGE_HOST?.trim().toLowerCase() ?? "";
	const storedImages = new Map<string, string | null>();
	const warnings: { page_id: number; image_url: string; reason: string }[] = [];
	const skippedPages: number[] = [];
	let pageCount = 0;
	let imageCount = 0;

	async function writeArchive() {
		for (const { id } of pages) {
			signal.throwIfAborted();
			const page = await fetchExportPage(userId, id);
			if (!page) {
				skippedPages.push(id);
				continue;
			}
			const { mdastJson, tagsJson, ...metadata } = page;
			const tree = remark().use(remarkGfm).parse(mdastToMarkdown(mdastJson));
			const paths = new Map<string, string>();
			for (const url of getExportImageUrls(tree)) {
				signal.throwIfAborted();
				if (url.startsWith("data:image/")) continue;
				const key = getExportImageKey(url, origin, imageHost);
				if (!key) {
					warnings.push({
						page_id: id,
						image_url: url,
						reason: "external-reference",
					});
					continue;
				}
				if (!storedImages.has(key)) {
					const image = await readExportImage(key).catch(() => {
						signal.throwIfAborted();
						return null;
					});
					if (image) {
						const path = await exportImageFilename(key, image.contentType);
						await zip.add(path, image.body, { signal });
						storedImages.set(key, path);
						imageCount++;
					} else storedImages.set(key, null);
				}
				const path = storedImages.get(key);
				if (path) paths.set(url, path);
				else
					warnings.push({
						page_id: id,
						image_url: url,
						reason: "image-unavailable",
					});
			}
			const document = serializeExportPage(
				{
					...metadata,
					title: metadata.title ?? "",
					tags: JSON.parse(tagsJson),
				},
				tree,
				paths,
			);
			await zip.add(document.filename, new Blob([document.markdown]).stream(), {
				signal,
				lastModDate: page.updatedAt,
			});
			pageCount++;
		}
		await zip.add(
			"README.md",
			new Blob([
				[
					"# Evame document export",
					"",
					"documents/ contains all your source documents, including private and archived documents.",
					"Each Markdown file includes its original title, slug, language, status, parent ID, dates, and tags as YAML frontmatter.",
					"images/ contains the stored image originals. Markdown and HTML image references use relative paths.",
					"",
					"External images and embeds retain their original URLs. Unavailable images also retain their original URLs.",
					"See export-report.json for document/image counts, images that were not copied, and documents removed during export.",
					"Translations, comments, votes, and revision history are not included. This is a source-document export, not a database restore package.",
					"Files can be extracted into a Git repository and committed normally.",
					"",
				].join("\n"),
			]).stream(),
			{ signal },
		);
		await zip.add(
			"export-report.json",
			new Blob([
				`${JSON.stringify({ format_version: 1, pages: pageCount, images: imageCount, skipped_page_ids: skippedPages, warnings }, null, 2)}\n`,
			]).stream(),
			{ signal },
		);
		await zip.close();
	}
	void writeArchive().catch((error) => outputController.error(error));
	return stream.readable;
}
