import type { GeminiApiKey, User } from "@prisma/client";
import { prisma } from "~/utils/prisma";

export async function fetchUserByHandle(handle: string): Promise<User | null> {
	return await prisma.user.findUnique({
		where: { handle },
	});
}

export async function fetchGeminiApiKeyByHandle(
	handle: string,
): Promise<GeminiApiKey | null> {
	const user = await prisma.user.findUnique({
		where: { handle },
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
		where: { status: "PUBLIC" },
		select: {
			id: true,
			slug: true,
			createdAt: true,
			updatedAt: true,
			user: { select: { handle: true } },
			pageSegments: {
				where: {
					number: 0,
				},
				select: {
					number: true,
					text: true,
					pageSegmentTranslations: {
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
			handle: true,
			updatedAt: true,
		},
	});
}
