import { randomUUID } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import type { Root as MdastRoot } from "mdast";
import { db } from "@/db";
import type { JsonValue, PageStatus, SegmentTypeKey } from "@/db/types";
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
	const user = await db
		.insertInto("users")
		.values({
			id: createId(),
			handle: data?.handle ?? `testuser-${uniqueId}`,
			name: data?.name ?? "Test User",
			email: data?.email ?? `testuser-${uniqueId}@example.com`,
			image: data?.image ?? "https://example.com/image.jpg",
			profile: data?.profile ?? "",
		})
		.returningAll()
		.executeTakeFirstOrThrow();
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
	publishedAt?: Date | null;
	archivedAt?: Date | null;
}) {
	const content = await db
		.insertInto("contents")
		.values({ kind: "PAGE" })
		.returningAll()
		.executeTakeFirstOrThrow();

	const page = await db
		.insertInto("pages")
		.values({
			id: content.id,
			slug: data.slug,
			userId: data.userId,
			status: data.status ?? "PUBLIC",
			mdastJson: (data.mdastJson ?? {}) as JsonValue,
			sourceLocale: data.sourceLocale ?? "en",
			parentId: data.parentId ?? null,
			publishedAt: data.publishedAt ?? null,
			archivedAt: data.archivedAt ?? null,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
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

	const segment = await db
		.insertInto("segments")
		.values({
			contentId: data.contentId,
			number: data.number,
			text: data.text,
			textAndOccurrenceHash: data.textAndOccurrenceHash,
			segmentTypeId,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
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

	await db
		.insertInto("segments")
		.values(
			data.segments.map((seg) => ({
				contentId: data.contentId,
				number: seg.number,
				text: seg.text,
				textAndOccurrenceHash: seg.textAndOccurrenceHash,
				segmentTypeId: segmentTypeIdMap[seg.segmentTypeKey],
			})),
		)
		.execute();
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
	const link = await db
		.insertInto("segmentAnnotationLinks")
		.values({
			mainSegmentId: data.mainSegmentId,
			annotationSegmentId: data.annotationSegmentId,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
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
			const existing = await db
				.selectFrom("tags")
				.selectAll()
				.where("name", "=", name)
				.executeTakeFirst();

			if (existing) {
				return existing;
			}

			const newTag = await db
				.insertInto("tags")
				.values({ name })
				.returningAll()
				.executeTakeFirstOrThrow();
			return newTag;
		}),
	);

	// タグとページをリンク
	await db
		.insertInto("tagPages")
		.values(
			tagResults.map((tag) => ({
				tagId: tag.id,
				pageId: page.id,
			})),
		)
		.execute();

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
	const annotationContent = await db
		.insertInto("contents")
		.values({ kind: "PAGE" })
		.returningAll()
		.executeTakeFirstOrThrow();

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
		const mainSegment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", mainPage.id)
			.where("number", "=", annotationSegment.linkedToMainSegmentNumber)
			.executeTakeFirst();

		// 注釈セグメントを取得
		const annSegment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", annotationContent.id)
			.where("number", "=", annotationSegment.number)
			.executeTakeFirst();

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
	const apiKey = await db
		.insertInto("geminiApiKeys")
		.values({
			userId: data.userId,
			apiKey: data.apiKey ?? "dummy-api-key",
		})
		.returningAll()
		.executeTakeFirstOrThrow();
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
	const content = await db
		.insertInto("contents")
		.values({ kind: "PAGE_COMMENT" })
		.returningAll()
		.executeTakeFirstOrThrow();

	const defaultMdastJson: MdastRoot = {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [{ type: "text", value: "test comment" }],
			},
		],
	};

	const pageComment = await db
		.insertInto("pageComments")
		.values({
			id: content.id,
			userId: data.userId,
			pageId: data.pageId,
			locale: data.locale ?? "en",
			mdastJson: (data.mdastJson ?? defaultMdastJson) as JsonValue,
			parentId: data.parentId ?? null,
			isDeleted: data.isDeleted ?? false,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return pageComment;
}

/**
 * テスト用セッションを作成
 */
export async function createSession(data: {
	userId: string;
	token?: string;
	expiresAt?: Date;
}) {
	const token = data.token ?? `session_${randomUUID().replace(/-/g, "")}`;
	const session = await db
		.insertInto("sessions")
		.values({
			id: createId(),
			token,
			userId: data.userId,
			expiresAt: data.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24),
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return session;
}

/**
 * テスト用PATを作成
 * plainKeyを返す（DB保存はSHA256ハッシュのみ）
 */
export async function createPersonalAccessToken(data: {
	userId: string;
	name?: string;
}) {
	const { createHash, randomBytes } = await import("node:crypto");
	const plainKey = `evame_${randomBytes(24).toString("hex")}`;
	const keyHash = createHash("sha256").update(plainKey).digest("hex");

	const personalAccessToken = await db
		.insertInto("personalAccessTokens")
		.values({
			keyHash,
			userId: data.userId,
			name: data.name ?? "test-key",
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return { ...personalAccessToken, plainKey };
}
