import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const selectUserFields = () => {
	return {
		id: true,
		name: true,
		handle: true,
		image: true,
		createdAt: true,
		updatedAt: true,
		profile: true,
		twitterHandle: true,
		totalPoints: true,
		isAI: true,
		plan: true,
	};
};

export const selectPageFields = (
	locale = "en",
	where?: Prisma.SegmentWhereInput,
) => ({
	id: true,
	slug: true,
	createdAt: true,
	status: true,
	sourceLocale: true,
	parentId: true,
	order: true,
	user: {
		select: selectUserFields(),
	},
	content: {
		select: {
			segments: {
				...(where ? { where } : {}),
				select: {
					id: true,
					number: true,
					text: true,
					segmentTranslations:
						selectSegmentTranslations(locale).segmentTranslations,
				},
			},
		},
	},
});
// 共通: locale ごとの最適化済み segmentTranslations を取得する include/select ビルダー
export const selectSegmentTranslations = (locale: string) => ({
	segmentTranslations: {
		where: { locale },
		select: {
			segmentId: true,
			userId: true,
			id: true,
			locale: true,
			text: true,
			point: true,
			createdAt: true,
			user: { select: selectUserFields() },
		},
		orderBy: [
			{ point: Prisma.SortOrder.desc },
			{ createdAt: Prisma.SortOrder.desc },
		],
		take: 1,
	},
});

export async function getPageById(pageId: number) {
	const page = await prisma.page.findUnique({
		where: { id: pageId },
		include: {
			user: {
				select: selectUserFields(),
			},
		},
	});
	return page;
}
