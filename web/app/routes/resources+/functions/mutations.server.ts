import { json } from "@remix-run/node";
import { prisma } from "~/utils/prisma";
export const updateGeminiApiKey = async (
	userId: number,
	geminiApiKey: string,
) => {
	await prisma.user.update({
		where: { id: userId },
		data: { geminiApiKey },
	});
};

export const deleteOwnTranslation = async (
	currentUserName: string,
	translationId: number,
) => {
	const translation = await prisma.translateText.findUnique({
		where: { id: translationId },
		select: { user: true },
	});
	if (!translation) {
		return json({ error: "Translation not found" }, { status: 404 });
	}
	if (translation.user.userName !== currentUserName) {
		return json({ error: "Unauthorized" }, { status: 403 });
	}
	await prisma.translateText.update({
		where: { id: translationId },
		data: { isArchived: true },
	});
};

export async function addUserTranslation(
	sourceTextId: number,
	text: string,
	userId: number,
	locale: string,
) {
	const sourceText = await prisma.sourceText.findUnique({
		where: { id: sourceTextId },
	});

	if (sourceText) {
		await prisma.translateText.create({
			data: {
				locale,
				text,
				sourceTextId,
				userId,
			},
		});
	}

	return json({ success: true });
}

export async function handleVote(
	translateTextId: number,
	isUpvote: boolean,
	userId: number,
) {
	await prisma.$transaction(async (tx) => {
		const existingVote = await tx.vote.findUnique({
			where: {
				translateTextId_userId: { translateTextId, userId },
			},
		});

		if (existingVote) {
			if (existingVote.isUpvote === isUpvote) {
				await tx.vote.delete({ where: { id: existingVote.id } });
				await tx.translateText.update({
					where: { id: translateTextId },
					data: { point: { increment: isUpvote ? -1 : 1 } },
				});
			} else {
				await tx.vote.update({
					where: { id: existingVote.id },
					data: { isUpvote },
				});
				await tx.translateText.update({
					where: { id: translateTextId },
					data: { point: { increment: isUpvote ? 2 : -2 } },
				});
			}
		} else {
			await tx.vote.create({
				data: { userId, translateTextId, isUpvote },
			});
			await tx.translateText.update({
				where: { id: translateTextId },
				data: { point: { increment: isUpvote ? 1 : -1 } },
			});
		}
	});

	return json({ success: true });
}

export async function toggleLike(userId: number, slug: string) {
	const page = await prisma.page.findUnique({ where: { slug } });
	if (!page) {
		throw new Error("Page not found");
	}

	const existingLike = await prisma.likePage.findUnique({
		where: {
			userId_pageId: {
				userId,
				pageId: page.id,
			},
		},
	});

	if (existingLike) {
		await prisma.likePage.delete({
			where: { id: existingLike.id },
		});
		return { liked: false };
	}
	await prisma.likePage.create({
		data: {
			userId,
			pageId: page.id,
		},
	});
	return { liked: true };
}
