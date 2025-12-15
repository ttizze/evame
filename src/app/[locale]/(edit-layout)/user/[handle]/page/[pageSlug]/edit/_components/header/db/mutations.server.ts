import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";
import type { PageStatus } from "@/drizzle/types";

export async function updatePageStatus(pageId: number, status: PageStatus) {
	const [updated] = await db
		.update(pages)
		.set({ status })
		.where(eq(pages.id, pageId))
		.returning();
	return updated;
}
