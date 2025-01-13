import type { GeminiApiKey, User } from "@prisma/client";
import { prisma } from "~/utils/prisma";

export async function fetchUserByUserName(
	userName: string,
): Promise<User | null> {
	return await prisma.user.findUnique({
		where: { userName },
	});
}

export async function fetchGeminiApiKeyByUserName(
	userName: string,
): Promise<GeminiApiKey | null> {
	const user = await prisma.user.findUnique({
		where: { userName },
	});
	if (!user) {
		return null;
	}
	return await prisma.geminiApiKey.findUnique({
		where: { userId: user.id },
	});
}

export async function fetchAllPublishedPages() {
	return prisma.page.findMany({
		where: { isPublished: true, isArchived: false },
		select: {
			id: true,
			slug: true,
			createdAt: true,
			updatedAt: true,
			user: { select: { userName: true } },
			sourceTexts: {
				where: {
					number: 0,
				},
				select: {
					number: true,
					text: true,
					translateTexts: {
						select: { id: true, text: true },
					},
				},
			},
		},
	});
}

export async function fetchAllUsersName() {
	return prisma.user.findMany({
		select: {
			userName: true,
			updatedAt: true,
		},
	});
}
