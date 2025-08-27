import type { GeminiApiKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function fetchUserByHandle(handle: string) {
	const user = await prisma.user.findUnique({
		where: { handle },
	});
	if (!user) {
		return null;
	}
	return user;
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
