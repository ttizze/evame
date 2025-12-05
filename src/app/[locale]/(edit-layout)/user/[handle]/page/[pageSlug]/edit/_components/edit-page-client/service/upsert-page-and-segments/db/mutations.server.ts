import type { Prisma, PrismaClient } from "@prisma/client";
import { ContentKind, PageStatus } from "@prisma/client";

/**
 * Prismaのトランザクションクライアントの型
 */
type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * ページをupsertする（DB操作のみ）
 */
export async function upsertPage(
	tx: TransactionClient,
	p: {
		pageSlug: string;
		userId: string;
		mdastJson: Prisma.InputJsonValue;
		sourceLocale: string;
		parentId: number | null;
		order: number | null;
		status: PageStatus | null;
	},
) {
	const page = await tx.page.upsert({
		where: { slug: p.pageSlug },
		update: {
			mdastJson: p.mdastJson,
			sourceLocale: p.sourceLocale,
			...(p.parentId !== null && { parentId: p.parentId }),
			...(p.order !== null && { order: p.order }),
			...(p.status !== null && { status: p.status }),
		},
		create: {
			slug: p.pageSlug,
			userId: p.userId,
			mdastJson: p.mdastJson,
			sourceLocale: p.sourceLocale,
			parentId: p.parentId,
			order: p.order ?? 0,
			status: p.status ?? PageStatus.DRAFT,
			id: (await tx.content.create({ data: { kind: ContentKind.PAGE } })).id,
		},
	});

	return page;
}
