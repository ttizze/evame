import type { BlockWithNumber } from "@/app/[locale]/lib/process-html";
import { prisma } from "@/lib/prisma";

export async function createPageComment(
	content: string,
	locale: string,
	userId: string,
	pageId: number,
) {
	return await prisma.pageComment.create({
		data: {
			content,
			locale,
			pageId,
			userId,
		},
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
		},
	});
}

export async function createPageCommentSegments(
	pageCommentId: number,
	blocks: BlockWithNumber[],
) {
	const segments = blocks.map((block) => ({
		pageCommentId,
		text: block.text,
		number: block.number,
		textAndOccurrenceHash: block.textAndOccurrenceHash,
	}));
	await prisma.pageCommentSegment.createMany({
		data: segments,
	});
	const insertedSegments = await prisma.pageCommentSegment.findMany({
		where: { pageCommentId },
		select: { id: true, textAndOccurrenceHash: true },
	});
	const hashToId = new Map<string, number>();
	for (const seg of insertedSegments) {
		// textAndOccurrenceHash が null の場合は無視
		if (seg.textAndOccurrenceHash) {
			hashToId.set(seg.textAndOccurrenceHash, seg.id);
		}
	}

	// 4. hash => ID のマップを返却
	return hashToId;
}

export async function upsertPageComment(
	id: number,
	content: string,
	locale: string,
	userId: string,
	pageId: number,
) {
	await prisma.pageComment.upsert({
		where: {
			id,
		},
		update: {
			content,
		},
		create: {
			content,
			locale,
			userId,
			pageId,
		},
	});
}

export async function createNotificationPageComment(
	actorId: string,
	userId: string,
	pageCommentId: number,
) {
	try {
		const notification = await prisma.notification.create({
			data: {
				userId: userId,
				type: "PAGE_COMMENT",
				pageCommentId,
				actorId: actorId,
			},
		});
		return notification;
	} catch (error) {
		console.error("Error in createNotificationPageComment:", error);
		throw error;
	}
}
