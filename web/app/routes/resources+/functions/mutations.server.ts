import { json } from "@remix-run/node";
import { encrypt } from "~/utils/encryption.server";
import { prisma } from "~/utils/prisma";

export const updateGeminiApiKey = async (
	userId: number,
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
		return json({ error: "Translation not found" }, { status: 404 });
	}
	if (translation.user.handle !== currentHandle) {
		return json({ error: "Unauthorized" }, { status: 403 });
	}
	await prisma.pageSegmentTranslation.update({
		where: { id: translationId },
		data: { isArchived: true },
	});
};

export async function addUserTranslation(
	pageSegmentId: number,
	text: string,
	userId: number,
	locale: string,
) {
	const pageSegment = await prisma.pageSegment.findUnique({
		where: { id: pageSegmentId },
	});

	if (pageSegment) {
		await prisma.pageSegmentTranslation.create({
			data: {
				locale,
				text,
				pageSegmentId,
				userId,
			},
		});
	}

	return json({ success: true });
}

export async function handleVote(
	pageSegmentTranslationId: number,
	isUpvote: boolean,
	userId: number,
) {
	await prisma.$transaction(async (tx) => {
		const existingVote = await tx.vote.findUnique({
			where: {
				pageSegmentTranslationId_userId: { pageSegmentTranslationId, userId },
			},
		});

		if (existingVote) {
			if (existingVote.isUpvote === isUpvote) {
				await tx.vote.delete({ where: { id: existingVote.id } });
				await tx.pageSegmentTranslation.update({
					where: { id: pageSegmentTranslationId },
					data: { point: { increment: isUpvote ? -1 : 1 } },
				});
			} else {
				await tx.vote.update({
					where: { id: existingVote.id },
					data: { isUpvote },
				});
				await tx.pageSegmentTranslation.update({
					where: { id: pageSegmentTranslationId },
					data: { point: { increment: isUpvote ? 2 : -2 } },
				});
			}
		} else {
			await tx.vote.create({
				data: { userId, pageSegmentTranslationId, isUpvote },
			});
			await tx.pageSegmentTranslation.update({
				where: { id: pageSegmentTranslationId },
				data: { point: { increment: isUpvote ? 1 : -1 } },
			});
		}
	});

	return json({ success: true });
}

export async function toggleLike(
	slug: string,
	userId?: number,
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
