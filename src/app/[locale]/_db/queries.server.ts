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

export const selectSegmentFields = (locale: string) => ({
	id: true,
	number: true,
	text: true,
	segmentType: {
		select: {
			key: true,
			label: true,
		},
	},
	...selectSegmentTranslations(locale),
});

const basePageFieldSelect = {
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
} as const;

const buildPageSelect = (locale: string, where?: Prisma.SegmentWhereInput) =>
	({
		...basePageFieldSelect,
		content: {
			select: {
				segments: {
					...(where ? { where } : {}),
					select: selectSegmentFields(locale),
				},
			},
		},
	}) as const;

const buildPageSelectWithLocators = (
	locale: string,
	where?: Prisma.SegmentWhereInput,
) =>
	({
		...basePageFieldSelect,
		content: {
			select: {
				segments: {
					...(where ? { where } : {}),
					select: {
						...selectSegmentFields(locale),
						locators: {
							select: {
								segmentLocatorId: true,
								locator: {
									select: {
										id: true,
										segments: {
											select: {
												segment: {
													select: selectSegmentFields(locale),
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}) as const;

export function selectPageFields(
	locale?: string,
	where?: Prisma.SegmentWhereInput,
	includeLocators?: false,
): ReturnType<typeof buildPageSelect>;
export function selectPageFields(
	locale: string | undefined,
	where: Prisma.SegmentWhereInput | undefined,
	includeLocators: true,
): ReturnType<typeof buildPageSelectWithLocators>;
export function selectPageFields(
	locale = "en",
	where?: Prisma.SegmentWhereInput,
	includeLocators = false,
) {
	if (includeLocators) {
		return buildPageSelectWithLocators(locale, where);
	}
	return buildPageSelect(locale, where);
}
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
