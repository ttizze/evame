import { prisma } from "@/lib/prisma";
import type { PageStatus } from "@prisma/client";

export async function updatePageStatus(pageId: number, status: PageStatus) {
	return await prisma.page.update({
		where: { id: pageId },
		data: { status },
	});
}
