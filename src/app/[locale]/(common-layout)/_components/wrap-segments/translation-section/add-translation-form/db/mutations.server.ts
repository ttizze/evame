import { prisma } from "@/lib/prisma";

export async function addUserTranslation(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
) {
	await prisma.segmentTranslation.create({
		data: { segmentId, locale, text, userId },
	});
	return { success: true };
}
