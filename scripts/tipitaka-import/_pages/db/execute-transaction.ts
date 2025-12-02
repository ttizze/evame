import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

export async function executeTransaction<T>(
	callback: (tx: TransactionClient) => Promise<T>,
	options?: { timeout?: number },
): Promise<T> {
	return prisma.$transaction(callback, {
		timeout: 60000, // 60 seconds for batch operations
		...options,
	});
}

export async function findPageWithContent(
	tx: TransactionClient,
	pageId: number,
): Promise<
	import("@prisma/client").Prisma.PageGetPayload<{ include: { content: true } }>
> {
	return tx.page.findUniqueOrThrow({
		where: { id: pageId },
		include: { content: true },
	});
}
