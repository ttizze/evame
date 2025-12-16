import { prisma } from "@/tests/prisma";

/**
 * スラグとユーザーIDからページを取得する
 */
export async function findPageBySlugAndUserId(
	slug: string,
	userId: string,
): Promise<{ id: number }> {
	const page = await prisma.page.findFirstOrThrow({
		where: { slug, userId },
		select: { id: true },
	});
	return page;
}
