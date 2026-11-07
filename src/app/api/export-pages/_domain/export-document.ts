import type { Root } from "mdast";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import type { JsonValue, PageStatus } from "@/db/types";

export function getExportImageKey(
	source: string,
	origin: string,
	imageHost: string,
): string | null {
	try {
		const url = new URL(source, origin);
		if (!/^https?:$/.test(url.protocol) || url.username || url.password)
			return null;
		const hosts = ["images.evame.tech", "images.eveeve.org", imageHost];
		const path =
			url.origin === origin && url.pathname.startsWith("/api/uploads/")
				? url.pathname.slice("/api/uploads/".length)
				: url.protocol === "https:" && hosts.includes(url.hostname)
					? url.pathname.slice(1)
					: "";
		const key = decodeURIComponent(path);
		if (
			!/^(?:evame\/|eveeve\/)?uploads\/.+/.test(key) ||
			/[\\\p{Cc}]/u.test(key) ||
			key.split("/").some((part) => part === "." || part === "..")
		)
			return null;
		return key;
	} catch {
		return null;
	}
}

// Markdown内の生HTMLも、画像を書き換える場合だけ再シリアライズする。
function htmlImages(value: string, images: ReadonlyMap<string, string> | null) {
	const processor = unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeStringify);
	const tree = processor.parse(value);
	const urls: string[] = [];
	let changed = false;
	visit(tree, "element", (node) => {
		if (node.tagName !== "img" || typeof node.properties.src !== "string")
			return;
		const source = node.properties.src;
		urls.push(source);
		const path = images?.get(source);
		if (path) {
			node.properties.src = `../${path}`;
			changed = true;
		}
	});
	return { urls, html: changed ? processor.stringify(tree) : value };
}

export function getExportImageUrls(tree: Root): string[] {
	const references = new Set<string>();
	visit(tree, "imageReference", (node) => {
		references.add(node.identifier);
	});
	const urls = new Set<string>();
	visit(tree, (node) => {
		if (
			node.type === "image" ||
			(node.type === "definition" && references.has(node.identifier))
		)
			urls.add(node.url);
		if (node.type === "html")
			for (const url of htmlImages(node.value, null).urls) urls.add(url);
	});
	return [...urls];
}

export async function exportImageFilename(key: string, contentType: string) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(key),
	);
	const hash = Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	const extensions: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/png": "png",
		"image/gif": "gif",
		"image/webp": "webp",
		"image/svg+xml": "svg",
		"image/avif": "avif",
		"image/heic": "heic",
		"image/heif": "heif",
		"image/x-icon": "ico",
	};
	const extension =
		extensions[contentType] ??
		key
			.match(/\.(jpe?g|png|gif|webp|svg|avif|heic|heif|ico)$/i)?.[1]
			?.toLowerCase() ??
		"bin";
	return `images/${hash}.${extension}`;
}

export function serializeExportPage(
	page: {
		id: number;
		slug: string;
		title: string;
		sourceLocale: string;
		status: PageStatus;
		parentId: number | null;
		publishedAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
		tags: string[];
	},
	tree: Root,
	images: ReadonlyMap<string, string>,
) {
	const exported = structuredClone(tree);
	visit(exported, (node) => {
		if (node.type === "image" || node.type === "definition") {
			const path = images.get(node.url);
			if (path) node.url = `../${path}`;
		}
		if (node.type === "html") node.value = htmlImages(node.value, images).html;
	});
	const slug =
		Array.from(page.slug.replace(/[^\p{L}\p{N}_-]+/gu, "-"))
			.slice(0, 48)
			.join("")
			.replace(/^-+|-+$/g, "") || "document";
	const metadata = {
		id: page.id,
		slug: page.slug,
		title: page.title,
		source_locale: page.sourceLocale,
		status: page.status,
		parent_id: page.parentId,
		published_at: page.publishedAt?.toISOString() ?? null,
		created_at: page.createdAt.toISOString(),
		updated_at: page.updatedAt.toISOString(),
		tags: [...page.tags].sort(),
	};
	const frontmatter = Object.entries(metadata)
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
		.join("\n");
	return {
		filename: `documents/${page.id}-${slug}.md`,
		markdown: `---\n${frontmatter}\n---\n\n${mdastToMarkdown(exported as unknown as JsonValue)}`,
	};
}
