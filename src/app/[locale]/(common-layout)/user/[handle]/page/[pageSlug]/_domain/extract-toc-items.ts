import GithubSlugger from "github-slugger";
import type { SegmentForDetail, TitleSegment } from "@/app/[locale]/types";
import type { JsonObject, JsonValue } from "@/db/types";

export interface TocItem {
	anchorId: string;
	level: number;
	segment: TitleSegment;
}

const MAX_TOC_DEPTH = 4;

export function extractTocItems({
	mdast,
	segments,
}: {
	mdast: JsonValue;
	segments: SegmentForDetail[];
}): TocItem[] {
	// セグメント番号で引けるようにして、見出しとセグメントを対応付ける。
	const segmentsMap = new Map<number, SegmentForDetail>(
		segments.map((segment) => [segment.number, segment]),
	);
	const items: TocItem[] = [];
	const slugger = new GithubSlugger();

	// mdast を走査して見出しを文書順に集める。
	collectTocItems(mdast);

	return items;
	function collectTocItems(node: JsonValue): void {
		if (!node) return;

		if (Array.isArray(node)) {
			for (const child of node) {
				collectTocItems(child);
			}
			return;
		}

		if (typeof node !== "object") return;

		const record = node;
		if (record.type === "heading") {
			// data-number-id 経由でセグメントを引き、目次のラベルを組み立てる。
			const item = buildTocItem(record);
			if (item) items.push(item);
		}

		const children = record.children;
		if (Array.isArray(children)) {
			for (const child of children) {
				collectTocItems(child as JsonValue);
			}
		}
	}

	function buildTocItem(record: JsonObject): TocItem | null {
		const depthValue = record.depth;
		if (typeof depthValue !== "number" || depthValue > MAX_TOC_DEPTH) {
			return null;
		}
		const level = depthValue;

		const number = parseDataNumberId(record);
		if (number === null) return null;

		const segment = segmentsMap.get(number);
		if (!segment?.text?.trim()) return null;

		return {
			anchorId: slugger.slug(segment.text),
			level,
			segment: {
				id: segment.id,
				contentId: segment.contentId,
				number: segment.number,
				text: segment.text,
				translationText: segment.translationText,
			},
		};
	}
}

function parseDataNumberId(record: JsonObject): number | null {
	const data = asObject(record.data);
	const hProperties = asObject(data?.hProperties);
	const number = Number(hProperties?.["data-number-id"]);
	if (Number.isNaN(number)) return null;
	return number;
}

function asObject(value: JsonValue | undefined): JsonObject | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value;
}
