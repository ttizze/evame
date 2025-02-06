import { encrypt } from "@/lib/encryption.server";
import { prisma } from "@/lib/prisma";
import { data } from "@remix-run/node";
import { VoteIntent } from "../../[locale]/localecomponents/segment-and-translation-section/vote-button/vote-buttons";
export const updateGeminiApiKey = async (
	userId: string,
	geminiApiKey: string,
) => {
	const encryptedKey = encrypt(geminiApiKey);

	await prisma.geminiApiKey.upsert({
		where: {
			userId: userId,
		},
		create: {
			userId: userId,
			apiKey: encryptedKey,
		},
		update: {
			apiKey: encryptedKey,
		},
	});
};

export const deleteOwnTranslation = async (
	currentHandle: string,
	translationId: number,
) => {
	const translation = await prisma.pageSegmentTranslation.findUnique({
		where: { id: translationId },
		select: { user: true },
	});
	if (!translation) {
		return data({ error: "Translation not found" }, { status: 404 });
	}
	if (translation.user.handle !== currentHandle) {
		return data({ error: "Unauthorized" }, { status: 403 });
	}
	await prisma.pageSegmentTranslation.update({
		where: { id: translationId },
		data: { isArchived: true },
	});
};

export async function handleVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	userId: string,
	intent: VoteIntent,
) {
	if (intent === VoteIntent.PAGE_SEGMENT_TRANSLATION) {
		await prisma.$transaction(async (tx) => {
			const existingVote = await tx.vote.findUnique({
				where: {
					pageSegmentTranslationId_userId: {
						pageSegmentTranslationId: segmentTranslationId,
						userId,
					},
				},
			});

			if (existingVote) {
				if (existingVote.isUpvote === isUpvote) {
					await tx.vote.delete({ where: { id: existingVote.id } });
					await tx.pageSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? -1 : 1 } },
					});
				} else {
					await tx.vote.update({
						where: { id: existingVote.id },
						data: { isUpvote },
					});
					await tx.pageSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? 2 : -2 } },
					});
				}
			} else {
				await tx.vote.create({
					data: {
						userId,
						pageSegmentTranslationId: segmentTranslationId,
						isUpvote,
					},
				});
				await tx.pageSegmentTranslation.update({
					where: { id: segmentTranslationId },
					data: { point: { increment: isUpvote ? 1 : -1 } },
				});
			}
		});
	} else if (intent === VoteIntent.COMMENT_SEGMENT_TRANSLATION) {
		await prisma.$transaction(async (tx) => {
			const existingVote =
				await tx.pageCommentSegmentTranslationVote.findUnique({
					where: {
						pageCommentSegmentTranslationId_userId: {
							pageCommentSegmentTranslationId: segmentTranslationId,
							userId,
						},
					},
				});

			if (existingVote) {
				if (existingVote.isUpvote === isUpvote) {
					await tx.pageCommentSegmentTranslationVote.delete({
						where: { id: existingVote.id },
					});
					await tx.pageCommentSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? -1 : 1 } },
					});
				} else {
					await tx.pageCommentSegmentTranslationVote.update({
						where: { id: existingVote.id },
						data: { isUpvote },
					});
					await tx.pageCommentSegmentTranslation.update({
						where: { id: segmentTranslationId },
						data: { point: { increment: isUpvote ? 2 : -2 } },
					});
				}
			} else {
				await tx.pageCommentSegmentTranslationVote.create({
					data: {
						userId,
						pageCommentSegmentTranslationId: segmentTranslationId,
						isUpvote,
					},
				});
				await tx.pageCommentSegmentTranslation.update({
					where: { id: segmentTranslationId },
					data: { point: { increment: isUpvote ? 1 : -1 } },
				});
			}
		});
	}

	return data({ success: true });
}

export async function toggleLike(
	slug: string,
	userId?: string,
	guestId?: string,
) {
	const page = await prisma.page.findUnique({ where: { slug } });
	if (!page) {
		throw new Error("Page not found");
	}
	if (userId) {
		const existing = await prisma.likePage.findFirst({
			where: {
				pageId: page.id,
				OR: [{ userId: userId }],
			},
		});

		if (existing) {
			await prisma.likePage.delete({ where: { id: existing.id } });
			return { liked: false };
		}
		const created = await prisma.likePage.create({
			data: {
				pageId: page.id,
				userId,
			},
		});
	} else if (guestId) {
		const existing = await prisma.likePage.findFirst({
			where: {
				pageId: page.id,
				OR: [{ guestId: guestId }],
			},
		});
		if (existing) {
			await prisma.likePage.delete({ where: { id: existing.id } });
			return { liked: false };
		}
		await prisma.likePage.create({
			data: {
				pageId: page.id,
				guestId,
			},
		});
	}
	return { liked: true };
}
