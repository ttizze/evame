import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Root as MdastRoot } from "mdast";
import { db } from "@/drizzle";
import {
	contents,
	geminiApiKeys,
	pageComments,
	pages,
	segmentAnnotationLinks,
	segments,
	tagPages,
	tags,
	users,
} from "@/drizzle/schema";
import type { PageStatus, SegmentTypeKey } from "@/drizzle/types";
import { getSegmentTypeId } from "./db-helpers";

/**
 * テスト用ユーザーを作成
 */
export async function createUser(data?: {
	handle?: string;
	name?: string;
	email?: string;
	image?: string;
	profile?: string;
}) {
	const uniqueId = randomUUID().slice(0, 8);
	const [user] = await db
		.insert(users)
		.values({
			handle: data?.handle ?? `testuser-${uniqueId}`,
			name: data?.name ?? "Test User",
			email: data?.email ?? `testuser-${uniqueId}@example.com`,
			image: data?.image ?? "https://example.com/image.jpg",
			profile: data?.profile ?? "",
		})
		.returning();
	if (!user) {
		throw new Error("Failed to create user");
	}
	return user;
}

/**
 * テスト用ページを作成（セグメントなし）
 */
export async function createPage(data: {
	userId: string;
	slug: string;
	status?: PageStatus;
	mdastJson?: unknown;
	sourceLocale?: string;
	parentId?: number;
}) {
	const [content] = await db
		.insert(contents)
		.values({ kind: "PAGE" })
		.returning();
	if (!content) {
		throw new Error("Failed to create content");
	}

	const [page] = await db
		.insert(pages)
		.values({
			id: content.id,
			slug: data.slug,
			userId: data.userId,
			status: data.status ?? "PUBLIC",
			mdastJson: (data.mdastJson ?? {}) as MdastRoot,
			sourceLocale: data.sourceLocale ?? "en",
			parentId: data.parentId ?? null,
		})
		.returning();
	if (!page) {
		throw new Error("Failed to create page");
	}
	return page;
}

/**
 * セグメントを作成
 */
export async function createSegment(data: {
	contentId: number;
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	segmentTypeKey: SegmentTypeKey;
}) {
	const segmentTypeId = await getSegmentTypeId(data.segmentTypeKey);

	const [segment] = await db
		.insert(segments)
		.values({
			contentId: data.contentId,
			number: data.number,
			text: data.text,
			textAndOccurrenceHash: data.textAndOccurrenceHash,
			segmentTypeId,
		})
		.returning();
	if (!segment) {
		throw new Error("Failed to create segment");
	}
	return segment;
}

/**
 * 複数のセグメントを一括作成
 */
export async function createSegments(data: {
	contentId: number;
	segments: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		segmentTypeKey: SegmentTypeKey;
	}>;
}) {
	const primarySegmentTypeId = await getSegmentTypeId("PRIMARY");
	const commentarySegmentTypeId = await getSegmentTypeId("COMMENTARY");

	// segmentTypeKeyに基づいてIDをマッピング
	const segmentTypeIdMap: Record<SegmentTypeKey, number> = {
		PRIMARY: primarySegmentTypeId,
		COMMENTARY: commentarySegmentTypeId,
	};

	await db.insert(segments).values(
		data.segments.map((seg) => ({
			contentId: data.contentId,
			number: seg.number,
			text: seg.text,
			textAndOccurrenceHash: seg.textAndOccurrenceHash,
			segmentTypeId: segmentTypeIdMap[seg.segmentTypeKey],
		})),
	);
}

/**
 * ページとセグメントを一緒に作成
 */
export async function createPageWithSegments(data: {
	userId: string;
	slug: string;
	status?: PageStatus;
	mdastJson?: MdastRoot;
	sourceLocale?: string;
	segments: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		segmentTypeKey: SegmentTypeKey;
	}>;
}) {
	const page = await createPage({
		userId: data.userId,
		slug: data.slug,
		status: data.status,
		mdastJson: data.mdastJson,
		sourceLocale: data.sourceLocale,
	});

	await createSegments({
		contentId: page.id,
		segments: data.segments,
	});

	return page;
}

/**
 * SegmentAnnotationLinkを作成（注釈セグメントを本文セグメントにリンク）
 */
export async function createSegmentAnnotationLink(data: {
	mainSegmentId: number;
	annotationSegmentId: number;
}) {
	const [link] = await db
		.insert(segmentAnnotationLinks)
		.values({
			mainSegmentId: data.mainSegmentId,
			annotationSegmentId: data.annotationSegmentId,
		})
		.returning();
	if (!link) {
		throw new Error("Failed to create segment annotation link");
	}
	return link;
}

/**
 * ページとタグを一緒に作成
 */
export async function createPageWithTags(data: {
	userId: string;
	slug: string;
	status?: PageStatus;
	mdastJson?: unknown;
	sourceLocale?: string;
	tagNames: string[];
}) {
	const page = await createPage({
		userId: data.userId,
		slug: data.slug,
		status: data.status,
		mdastJson: data.mdastJson,
		sourceLocale: data.sourceLocale,
	});

	// タグを作成または取得
	const tagResults = await Promise.all(
		data.tagNames.map(async (name) => {
			const [existing] = await db
				.select()
				.from(tags)
				.where(eq(tags.name, name))
				.limit(1);

			if (existing) {
				return existing;
			}

			const [newTag] = await db.insert(tags).values({ name }).returning();
			if (!newTag) {
				throw new Error(`Failed to create tag: ${name}`);
			}
			return newTag;
		}),
	);

	// タグとページをリンク
	await db.insert(tagPages).values(
		tagResults.map((tag) => ({
			tagId: tag.id,
			pageId: page.id,
		})),
	);

	return page;
}

/**
 * 注釈付きページを作成（メインページと注釈コンテンツ）
 */
export async function createPageWithAnnotations(data: {
	userId: string;
	mainPageSlug: string;
	mainPageSegments: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
	}>;
	annotationSegments: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		linkedToMainSegmentNumber: number; // どのメインセグメントにリンクするか
	}>;
}) {
	// メインページを作成
	const mainPage = await createPageWithSegments({
		userId: data.userId,
		slug: data.mainPageSlug,
		segments: data.mainPageSegments.map((seg) => ({
			...seg,
			segmentTypeKey: "PRIMARY" as SegmentTypeKey,
		})),
	});

	// 注釈コンテンツを作成
	const [annotationContent] = await db
		.insert(contents)
		.values({ kind: "PAGE" })
		.returning();
	if (!annotationContent) {
		throw new Error("Failed to create annotation content");
	}

	// 注釈セグメントを作成
	await createSegments({
		contentId: annotationContent.id,
		segments: data.annotationSegments.map((seg) => ({
			...seg,
			segmentTypeKey: "COMMENTARY" as SegmentTypeKey,
		})),
	});

	// 直接リンクを作成
	for (const annotationSegment of data.annotationSegments) {
		// メインセグメントを取得
		const [mainSegment] = await db
			.select()
			.from(segments)
			.where(
				and(
					eq(segments.contentId, mainPage.id),
					eq(segments.number, annotationSegment.linkedToMainSegmentNumber),
				),
			)
			.limit(1);

		// 注釈セグメントを取得
		const [annSegment] = await db
			.select()
			.from(segments)
			.where(
				and(
					eq(segments.contentId, annotationContent.id),
					eq(segments.number, annotationSegment.number),
				),
			)
			.limit(1);

		if (mainSegment && annSegment) {
			await createSegmentAnnotationLink({
				mainSegmentId: mainSegment.id,
				annotationSegmentId: annSegment.id,
			});
		}
	}

	return {
		mainPage,
		annotationContent,
	};
}

/**
 * Gemini API Keyを作成
 */
export async function createGeminiApiKey(data: {
	userId: string;
	apiKey?: string;
}) {
	const [apiKey] = await db
		.insert(geminiApiKeys)
		.values({
			userId: data.userId,
			apiKey: data.apiKey ?? "dummy-api-key",
		})
		.returning();
	if (!apiKey) {
		throw new Error("Failed to create Gemini API key");
	}
	return apiKey;
}

/**
 * テスト用PageCommentを作成
 */
export async function createPageComment(data: {
	userId: string;
	pageId: number;
	locale?: string;
	mdastJson?: unknown;
	parentId?: number;
	isDeleted?: boolean;
}) {
	const [content] = await db
		.insert(contents)
		.values({ kind: "PAGE_COMMENT" })
		.returning();
	if (!content) {
		throw new Error("Failed to create content");
	}

	const defaultMdastJson: MdastRoot = {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [{ type: "text", value: "test comment" }],
			},
		],
	};

	const [pageComment] = await db
		.insert(pageComments)
		.values({
			id: content.id,
			userId: data.userId,
			pageId: data.pageId,
			locale: data.locale ?? "en",
			mdastJson: (data.mdastJson ?? defaultMdastJson) as MdastRoot,
			parentId: data.parentId ?? null,
			isDeleted: data.isDeleted ?? false,
		})
		.returning();
	if (!pageComment) {
		throw new Error("Failed to create page comment");
	}
	return pageComment;
}
