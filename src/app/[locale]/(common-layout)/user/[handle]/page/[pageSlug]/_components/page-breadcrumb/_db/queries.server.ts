import { selectPageFields } from "@/app/[locale]/_db/queries.server";
import { pickBestTranslation } from "@/app/[locale]/_lib/pick-best-translation";
import type { SegmentForUI } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";

type ParentNode = {
	id: number;
	slug: string;
	order: number;
	sourceLocale: string;
	status: string;
	parentId: number | null;
	createdAt: string;
	user: SanitizedUser;
	content: { segments: SegmentForUI[] };
	children: ParentNode[];
};

// 親ページの階層を取得する関数
export async function getParentChain(pageId: number, locale: string) {
	const parentChain: ParentNode[] = [];
	let currentParentId = await getParentId(pageId);

	while (currentParentId) {
		const parent = await prisma.page.findUnique({
			where: { id: currentParentId },
			select: selectPageFields(locale, { number: 0 }),
		});

		if (parent) {
			parentChain.unshift({
				id: parent.id,
				slug: parent.slug,
				order: parent.order,
				sourceLocale: parent.sourceLocale,
				status: parent.status,
				parentId: parent.parentId,
				createdAt: parent.createdAt.toISOString(),
				user: parent.user as SanitizedUser,
				content: {
					segments: pickBestTranslation(parent.content.segments),
				},
				children: [],
			});

			currentParentId = parent.parentId;
		} else {
			break;
		}
	}

	return parentChain;
}

// ページの親IDを取得する関数
async function getParentId(pageId: number): Promise<number | null> {
	const page = await prisma.page.findUnique({
		where: { id: pageId },
		select: { parentId: true },
	});
	return page?.parentId || null;
}
