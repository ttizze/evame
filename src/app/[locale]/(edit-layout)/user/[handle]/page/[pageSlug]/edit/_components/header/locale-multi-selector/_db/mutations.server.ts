import { prisma } from "@/lib/prisma";

export async function updateUserTargetLocales(
	userId: string,
	locales: string[],
) {
	return await prisma.userSetting.upsert({
		where: { userId },
		update: { targetLocales: locales },
		create: { userId, targetLocales: locales },
	});
}
