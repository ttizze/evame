import { prisma } from "~/utils/prisma";
import type { BlockWithNumber } from "../../utils/process-html";
export async function createPageComment(
	content: string,
	locale: string,
	userId: number,
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

export async function deletePageComment(pageCommentId: number) {
	return await prisma.pageComment.delete({
		where: { id: pageCommentId },
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
}

export async function upsertPageComment(
	id: number,
	content: string,
	locale: string,
	userId: number,
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
