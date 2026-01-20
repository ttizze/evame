import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiErrors, apiSuccess } from "@/app/types/api-response";
import { fetchLocaleInfoByPageSlug } from "./_db/queries.server";

export async function GET(req: NextRequest) {
	/* ① クエリパラメータを 1 回でバリデート */
	const Params = z.object({
		pageSlug: z.string(),
	});

	/* ② ここでパース失敗なら 400 を返す */
	const parseResult = Params.safeParse(
		Object.fromEntries(req.nextUrl.searchParams),
	);

	if (!parseResult.success) {
		return ApiErrors.badRequest("pageSlug is required");
	}

	const { pageSlug } = parseResult.data;

	/* ③ DB に問い合わせ */
	const localeInfo = await fetchLocaleInfoByPageSlug(pageSlug);
	if (!localeInfo) {
		return ApiErrors.notFound("page not found");
	}

	return apiSuccess(localeInfo);
}
