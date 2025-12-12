import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages, translationJobs, users } from "@/drizzle/schema";

type CreateTranslationJobParams = {
	aiModel: string;
	locale: string;
	userId?: string;
	pageId: number;
};

/**
 * 翻訳ジョブを作成
 * Drizzle版に移行済み
 */
export async function createTranslationJob(params: CreateTranslationJobParams) {
	// 1. 翻訳ジョブを作成
	const [translationJob] = await db
		.insert(translationJobs)
		.values({
			aiModel: params.aiModel,
			locale: params.locale,
			userId: params.userId,
			pageId: params.pageId,
			status: "PENDING",
			progress: 0,
		})
		.returning();

	if (!translationJob) {
		throw new Error("Failed to create translation job");
	}

	// 2. ページとユーザー情報を取得
	const [pageData] = await db
		.select({
			page: {
				slug: pages.slug,
			},
			user: {
				handle: users.handle,
			},
		})
		.from(pages)
		.innerJoin(users, eq(pages.userId, users.id))
		.where(eq(pages.id, params.pageId))
		.limit(1);

	if (!pageData) {
		throw new Error("Page not found");
	}

	return {
		...translationJob,
		page: {
			slug: pageData.page.slug,
			user: {
				handle: pageData.user.handle,
			},
		},
	};
}
