import { BASE_URL } from "@/app/_constants/base-url";
import { createTranslationJob as createTranslationJobDb } from "@/app/[locale]/_db/mutations.server";
import { db } from "@/db";

// ---------------- Types ----------------

type NumberedElement = { number: number; text: string };

// ---------------- Utils ----------------

/**
 * 再帰的に子ページを辿り、親を含むすべての pageId を取得します。
 */
async function getDescendantPageIds(parentId: number): Promise<number[]> {
	const children = await db
		.selectFrom("pages")
		.select("id")
		.where("parentId", "=", parentId)
		.execute();
	const ids: number[] = [];
	for (const child of children) {
		ids.push(child.id);
		ids.push(...(await getDescendantPageIds(child.id)));
	}
	return ids;
}

const toNumberedElements = (
	segments: { number: number; text: string }[],
): NumberedElement[] => segments.map(({ number, text }) => ({ number, text }));

// ---------------- Local DB helpers ----------------

type CreateTranslationJobParams = {
	aiModel: string;
	locale: string;
	userId?: string;
	pageId: number;
};

async function fetchUserByHandle(handle: string) {
	const user = await db
		.selectFrom("users")
		.selectAll()
		.where("handle", "=", handle)
		.executeTakeFirst();
	return user ?? null;
}

async function createTranslationJob(params: CreateTranslationJobParams) {
	return createTranslationJobDb({
		aiModel: params.aiModel,
		locale: params.locale,
		userId: params.userId,
		pageId: params.pageId,
	});
}

async function fetchPageIdBySlug(slug: string) {
	const page = await db
		.selectFrom("pages")
		.select("id")
		.where("slug", "=", slug)
		.executeTakeFirst();
	return page ?? null;
}

async function fetchPageWithPageSegments(pageId: number) {
	const page = await db
		.selectFrom("pages")
		.select("slug")
		.where("id", "=", pageId)
		.executeTakeFirst();
	if (!page) return null;

	const pageSegments = await db
		.selectFrom("segments")
		.select(["number", "text"])
		.where("contentId", "=", pageId)
		.orderBy("number", "asc")
		.execute();

	const title = pageSegments.find((seg) => seg.number === 0)?.text ?? "";
	return {
		slug: page.slug,
		title,
		content: { segments: pageSegments },
	};
}
// ---------------- Main ----------------

(async () => {
	try {
		const [
			,
			,
			SLUG,
			TARGET_LOCALE,
			AI_MODEL = "gemini-2.5-flash",
			USER_HANDLE = "evame",
		] = process.argv;

		if (!SLUG || !TARGET_LOCALE) {
			console.error(
				"Usage: ts-node scripts/translate.ts <slug> <targetLocale> [aiModel] [userHandle]",
			);
			process.exit(1);
		}

		// 1. ユーザー取得
		const user = await fetchUserByHandle(USER_HANDLE);
		if (!user) {
			console.error(`User ${USER_HANDLE} not found.`);
			process.exit(1);
		}

		// 2. ルートページ取得
		const rootPage = await fetchPageIdBySlug(SLUG);
		if (!rootPage) {
			console.error(`Page with slug '${SLUG}' not found.`);
			process.exit(1);
		}

		// 3. 子ページを含むすべての pageId を収集
		const pageIds = [rootPage.id, ...(await getDescendantPageIds(rootPage.id))];

		// 4. 各ページを翻訳キューに追加
		for (const pageId of pageIds) {
			const page = await fetchPageWithPageSegments(pageId);
			if (!page) {
				console.warn(`Page id ${pageId} not found. Skip.`);
				continue;
			}

			const numberedElements = toNumberedElements(page.content.segments);
			if (numberedElements.length === 0) {
				console.warn(`Page ${page.slug} has no segments. Skip.`);
				continue;
			}

			// TranslationJob を作成
			const job = await createTranslationJob({
				userId: user.id,
				aiModel: AI_MODEL,
				locale: TARGET_LOCALE,
				pageId,
			});

			// /api/translate エンドポイントへリクエスト
			await fetch(`${BASE_URL}/api/translate`, {
				method: "POST",
				body: JSON.stringify({
					provider: "vertex",
					translationJobId: job.id,
					aiModel: AI_MODEL,
					userId: user.id,
					targetLocale: TARGET_LOCALE,
					title: page.title,
					numberedElements,
					pageId,
				}),
			});

			console.log(
				`Queued translation for page slug '${page.slug}' (${TARGET_LOCALE}).`,
			);
		}

		console.log("All pages have been queued for translation.");
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
