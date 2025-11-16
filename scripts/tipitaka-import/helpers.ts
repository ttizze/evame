import type { Prisma, PrismaClient } from "@prisma/client";
import { generateHashForText } from "@/app/[locale]/_lib/generate-hash-for-text";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import {
	syncSegmentMetadataAndLocators,
	syncSegments,
} from "@/app/[locale]/_lib/sync-segments";

import type { DirectoryNode } from "./types";

type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

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

/**
 * 入力文字列をスラグに変換する
 * 同じ入力に対して常に同じスラグを生成する（一意性を保証）
 */
export function slugify(input: string): string {
	const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	const ascii = normalized
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return ascii || "untitled";
}

interface UpsertPageParams {
	tx: TransactionClient;
	slug: string;
	mdastJson: Prisma.InputJsonValue;
	parentId: number | null;
	order: number;
	userId: string;
}

/**
 * ページを upsert し、contentId を返す
 */
export async function upsertPage({
	tx,
	slug,
	mdastJson,
	parentId,
	order,
	userId,
}: UpsertPageParams): Promise<{ id: number; contentId: number }> {
	const existingPage = await tx.page.findUnique({
		where: { slug },
	});

	const contentId =
		existingPage?.id ??
		(await tx.content.create({ data: { kind: "PAGE" } })).id;

	const page = await tx.page.upsert({
		where: { slug },
		update: {
			mdastJson,
			order,
		},
		create: {
			id: contentId,
			slug,
			parentId,
			order,
			userId,
			mdastJson,
			status: "PUBLIC",
			sourceLocale: "pi",
		},
	});

	return { id: page.id, contentId };
}

export async function syncSegmentsWithFallback(
	tx: TransactionClient,
	pageId: number,
	segments: SegmentDraft[],
	fallbackTitle: string,
	segmentTypeId: number,
) {
	let segmentsToSync = segments;

	if (segments.length === 0) {
		const fallbackHash = generateHashForText(fallbackTitle, 0);
		segmentsToSync = [
			{
				number: 0,
				text: fallbackTitle,
				textAndOccurrenceHash: fallbackHash,
				metadata: { items: [] },
			},
		];
	}

	const hashToSegmentId = await syncSegments(
		tx,
		pageId,
		segmentsToSync,
		segmentTypeId,
	);
	await syncSegmentMetadataAndLocators(
		tx,
		pageId,
		hashToSegmentId,
		segmentsToSync,
	);
}

/**
 * ページを upsert し、セグメントを同期する共通処理
 */
export async function upsertPageWithSegments(
	tx: TransactionClient,
	params: Omit<UpsertPageParams, "tx"> & {
		segments: SegmentDraft[];
		fallbackTitle: string;
		segmentTypeId: number;
	},
): Promise<number> {
	const page = await upsertPage({ ...params, tx });
	await syncSegmentsWithFallback(
		tx,
		page.id,
		params.segments,
		params.fallbackTitle,
		params.segmentTypeId,
	);
	return page.id;
}
