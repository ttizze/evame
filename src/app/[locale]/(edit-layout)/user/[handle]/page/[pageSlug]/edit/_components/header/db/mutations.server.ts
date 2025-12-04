import type { PageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function updatePageStatus(pageId: number, status: PageStatus) {
	return await prisma.page.update({
		where: { id: pageId },
		data: { status },
	});
}
