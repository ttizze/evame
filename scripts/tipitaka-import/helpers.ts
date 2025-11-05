import type { DirectoryNode } from "./types";

export function beautifySlug(slug: string): string {
	return slug
		.replace(/-/g, " ")
		.replace(/\s+/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.trim();
}

export function parseSegmentLabel(segment: string): {
	title: string;
	order: number;
} {
	const match = segment.match(/^(\d+)-(.*)$/);
	if (!match) {
		return { order: Number.MAX_SAFE_INTEGER, title: beautifySlug(segment) };
	}
	const order = Number.parseInt(match[1], 10);
	const raw = match[2] ?? segment;
	return { order, title: beautifySlug(raw) };
}

export function splitHeaderAndBody(markdown: string): {
	header: string;
	body: string;
} {
	const lines = markdown.split(/\r?\n/);
	let header = "";
	const bodyLines: string[] = [];
	for (const line of lines) {
		if (!header && /^#\s+/.test(line.trim())) {
			header = line.replace(/^#\s+/, "").trim();
			continue;
		}
		bodyLines.push(line);
	}
	const body = bodyLines.join("\n").trim();
	return { header, body };
}

export function getOrderGenerator() {
	const counters = new Map<number, number>();
	return (parentId: number) => {
		const next = counters.get(parentId) ?? 0;
		counters.set(parentId, next + 1);
		return next;
	};
}

export function getSortedChildren(node: DirectoryNode): DirectoryNode[] {
	return [...node.children.values()].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.title.localeCompare(b.title);
	});
}
