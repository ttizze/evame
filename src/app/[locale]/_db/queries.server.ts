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
// 共通: locale ごとの最適化済み segmentTranslations を取得する include/select ビルダー
const selectSegmentTranslations = (locale: string) => ({
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

const buildPageSelectWithAnnotations = (
	locale: string,
	where?: Prisma.SegmentWhereInput,
) =>
	({
		...basePageFieldSelect,
		content: {
			select: {
				segments: {
					where: {
						...(where || {}),
						segmentType: { key: "PRIMARY" },
					},
					orderBy: { number: "asc" },
					select: {
						...selectSegmentFields(locale),
						annotations: {
							select: {
								annotationSegment: {
									select: selectSegmentFields(locale),
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
	includeAnnotations?: false,
): ReturnType<typeof buildPageSelect>;
export function selectPageFields(
	locale: string | undefined,
	where: Prisma.SegmentWhereInput | undefined,
	includeAnnotations: true,
): ReturnType<typeof buildPageSelectWithAnnotations>;
export function selectPageFields(
	locale = "en",
	where?: Prisma.SegmentWhereInput,
	includeAnnotations = false,
) {
	if (includeAnnotations) {
		return buildPageSelectWithAnnotations(locale, where);
	}
	return buildPageSelect(locale, where);
}

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
