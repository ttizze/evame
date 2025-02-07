import { encrypt } from "@/lib/encryption.server";
import { prisma } from "@/lib/prisma";

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
