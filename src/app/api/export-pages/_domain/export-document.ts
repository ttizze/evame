import type { Definition, Root } from "mdast";
import { type DefaultTreeAdapterMap, parseFragment } from "parse5";
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

// 属性の位置だけを書き換え、Markdown本文を囲む未閉鎖のHTMLを補完しない。
function htmlImages(value: string, images: ReadonlyMap<string, string> | null) {
	const tree = parseFragment(value, { sourceCodeLocationInfo: true });
	const urls: string[] = [];
	const changes: { start: number; end: number; src: string }[] = [];
	function collect(node: DefaultTreeAdapterMap["node"]) {
		if ("tagName" in node && node.tagName === "img") {
			const source = node.attrs.find(
				(attribute) => attribute.name === "src",
			)?.value;
			if (source !== undefined) {
				urls.push(source);
				const path = images?.get(source);
				const location = node.sourceCodeLocation?.attrs?.src;
				if (path && location)
					changes.push({
						start: location.startOffset,
						end: location.endOffset,
						src: `../${path}`,
					});
			}
		}
		if ("childNodes" in node)
			for (const child of node.childNodes) collect(child);
		if ("content" in node) collect(node.content);
	}
	collect(tree);
	let html = value;
	for (const change of changes.sort(
		(left, right) => right.start - left.start,
	)) {
		const src = change.src
			.replaceAll("&", "&amp;")
			.replaceAll('"', "&quot;")
			.replaceAll("<", "&lt;");
		html = `${html.slice(0, change.start)}src="${src}"${html.slice(change.end)}`;
	}
	return { urls, html };
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
			(node.type === "definition" && references.delete(node.identifier))
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
		commentsEnabled: boolean;
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
	const definitions = new Map<string, Definition>();
	visit(exported, "definition", (node) => {
		if (!definitions.has(node.identifier))
			definitions.set(node.identifier, node);
	});
	visit(exported, (node, index, parent) => {
		if (node.type === "image") {
			const path = images.get(node.url);
			if (path) node.url = `../${path}`;
		}
		if (node.type === "imageReference") {
			const definition = definitions.get(node.identifier);
			const path = definition && images.get(definition.url);
			if (definition && path && parent && index !== undefined)
				parent.children[index] = {
					type: "image",
					url: `../${path}`,
					alt: node.alt ?? null,
					title: definition.title ?? null,
				};
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
		comments_enabled: page.commentsEnabled,
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
