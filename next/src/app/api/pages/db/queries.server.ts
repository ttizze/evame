import { fetchLatestPageAITranslationInfo } from "@/app/[locale]/_db/queries.server";
import { prisma } from "@/lib/prisma";
export const fetchPagesWithUser = async () => {
	const pages = await prisma.page.findMany({
		select: {
			id: true,
			slug: true,
			updatedAt: true,
			user: {
				select: { handle: true },
			},
		},
	});
	return pages;
};
export type PageWithUser = Awaited<
	ReturnType<typeof fetchPagesWithUser>
>[number];

export async function fetchPagesWithUserAndTranslation() {
	const pagesWithUser = await fetchPagesWithUser();
	const pagesWithTranslation = await Promise.all(
		pagesWithUser.map(async (page) => {
			const translationInfo = await fetchLatestPageAITranslationInfo(page.id);
			return { ...page, translationInfo };
		}),
	);
	return pagesWithTranslation;
}
export type PageWithUserAndTranslation = Awaited<
	ReturnType<typeof fetchPagesWithUserAndTranslation>
>[number];
