#!/usr/bin/env node
import { encrypt } from "../app/utils/encryption.server.js";
import { prisma } from "../app/utils/prisma.js";

async function encryptUnencryptedGeminiKeys() {
	try {
		// Find users with unencrypted geminiApiKey (doesn't contain ':')
		const users = await prisma.user.findMany({
			where: {
				AND: [
					{ geminiApiKey: { not: null } },
					{ geminiApiKey: { not: { contains: ":" } } }
				]
			},
			select: {
				id: true,
				userName: true,
				geminiApiKey: true,
			},
		});

		console.log(`Found ${users.length} users with unencrypted Gemini API keys`);

		// Encrypt each key and update the database
		for (const user of users) {
			if (!user.geminiApiKey) continue;

			try {
				const encryptedKey = encrypt(user.geminiApiKey);
				await prisma.user.update({
					where: { id: user.id },
					data: { geminiApiKey: encryptedKey },
				});
				console.log(`✅ Encrypted key for user: ${user.userName}`);
			} catch (error) {
				console.error(`❌ Failed to encrypt key for user: ${user.userName}`, error);
			}
		}

		console.log("Encryption process completed");
	} catch (error) {
		console.error("Failed to process users:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run the script
encryptUnencryptedGeminiKeys();
