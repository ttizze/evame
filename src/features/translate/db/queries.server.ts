import { prisma } from "@/lib/prisma";

export async function getPageSegments(pageId: number) {
	return await prisma.pageSegment.findMany({
		where: { pageId },
		select: {
			id: true,
			number: true,
		},
	});
}

export async function getPageCommentSegments(pageCommentId: number) {
	return await prisma.pageCommentSegment.findMany({
		where: {
			pageCommentId,
		},
		select: {
			id: true,
			number: true,
		},
	});
}

export async function fetchGeminiApiKeyByUserId(
	userId: string,
): Promise<string | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});
	if (!user) {
		return null;
	}
	const geminiApiKey = await prisma.geminiApiKey.findUnique({
		where: { userId: user.id },
	});
	if (!geminiApiKey) {
		return null;
	}
	return geminiApiKey.apiKey;
}
