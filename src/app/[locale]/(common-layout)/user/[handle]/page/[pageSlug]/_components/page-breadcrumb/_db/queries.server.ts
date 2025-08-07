import { selectPageFields } from "@/app/[locale]/_db/page-list-queries.server";
import { toSegmentBundles } from "@/app/[locale]/_lib/to-segment-bundles";
import { transformPageSegments } from "@/app/[locale]/_lib/transform-page-segments";
import { prisma } from "@/lib/prisma";

// 親ページの階層を取得する関数
export async function getParentChain(pageId: number, locale: string) {
	const parentChain = [];
	let currentParentId = await getParentId(pageId);

	while (currentParentId) {
		const parent = await prisma.page.findUnique({
			where: { id: currentParentId },
			select: selectPageFields(locale),
		});

		if (parent) {
			const normalized = transformPageSegments(parent.pageSegments);
			const segmentBundles = toSegmentBundles("page", parent.id, normalized);

			parentChain.unshift({
				id: parent.id,
				slug: parent.slug,
				order: parent.order,
				sourceLocale: parent.sourceLocale,
				status: parent.status,
				parentId: parent.parentId,
				createdAt: parent.createdAt.toISOString(),
				user: parent.user,
				segmentBundles,
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
