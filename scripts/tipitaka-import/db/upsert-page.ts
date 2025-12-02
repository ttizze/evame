import type { Prisma, PrismaClient } from "@prisma/client";

type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

export interface UpsertPageParams {
	tx: TransactionClient;
	slug: string;
	mdastJson: Prisma.InputJsonValue;
	parentId: number | null;
	order: number;
	userId: string;
}

/**
 * ページを upsert し、contentId を返す
 */
export async function upsertPage({
	tx,
	slug,
	mdastJson,
	parentId,
	order,
	userId,
}: UpsertPageParams): Promise<{ id: number; contentId: number }> {
	const existingPage = await tx.page.findUnique({
		where: { slug },
	});

	const contentId =
		existingPage?.id ??
		(await tx.content.create({ data: { kind: "PAGE" } })).id;

	const page = await tx.page.upsert({
		where: { slug },
		update: {
			mdastJson,
			order,
		},
		create: {
			id: contentId,
			slug,
			parentId,
			order,
			userId,
			mdastJson,
			status: "PUBLIC",
			sourceLocale: "pi",
		},
	});

	return { id: page.id, contentId };
}
