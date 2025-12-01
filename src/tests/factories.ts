import type { PageStatus, SegmentTypeKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
	return await prisma.user.create({
		data: {
			handle: data?.handle ?? `testuser-${Date.now()}`,
			name: data?.name ?? "Test User",
			email: data?.email ?? `testuser-${Date.now()}@example.com`,
			image: data?.image ?? "https://example.com/image.jpg",
			profile: data?.profile ?? "",
		},
	});
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
}) {
	const content = await prisma.content.create({
		data: { kind: "PAGE" },
	});

	return await prisma.page.create({
		data: {
			id: content.id,
			slug: data.slug,
			userId: data.userId,
			status: data.status ?? "PUBLIC",
			mdastJson: data.mdastJson ?? {},
			sourceLocale: data.sourceLocale ?? "en",
		},
	});
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

	return await prisma.segment.create({
		data: {
			contentId: data.contentId,
			number: data.number,
			text: data.text,
			textAndOccurrenceHash: data.textAndOccurrenceHash,
			segmentTypeId,
		},
	});
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

	return await prisma.segment.createMany({
		data: data.segments.map((seg) => ({
			contentId: data.contentId,
			number: seg.number,
			text: seg.text,
			textAndOccurrenceHash: seg.textAndOccurrenceHash,
			segmentTypeId: segmentTypeIdMap[seg.segmentTypeKey],
		})),
	});
}

/**
 * ページとセグメントを一緒に作成
 */
export async function createPageWithSegments(data: {
	userId: string;
	slug: string;
	status?: PageStatus;
	mdastJson?: unknown;
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
	return await prisma.segmentAnnotationLink.create({
		data: {
			mainSegmentId: data.mainSegmentId,
			annotationSegmentId: data.annotationSegmentId,
		},
	});
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
	const tags = await Promise.all(
		data.tagNames.map(async (name) => {
			return await prisma.tag.upsert({
				where: { name },
				update: {},
				create: { name },
			});
		}),
	);

	// タグとページをリンク
	await prisma.tagPage.createMany({
		data: tags.map((tag) => ({
			tagId: tag.id,
			pageId: page.id,
		})),
	});

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
	const annotationContent = await prisma.content.create({
		data: { kind: "PAGE" },
	});

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
		const mainSegment = await prisma.segment.findFirst({
			where: {
				contentId: mainPage.id,
				number: annotationSegment.linkedToMainSegmentNumber,
			},
		});

		// 注釈セグメントを取得
		const annSegment = await prisma.segment.findFirst({
			where: {
				contentId: annotationContent.id,
				number: annotationSegment.number,
			},
		});

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
