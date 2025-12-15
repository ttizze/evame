import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
		return NextResponse.json(
			{ message: "pageSlug is required" },
			{ status: 400 },
		);
	}

	const { pageSlug } = parseResult.data;

	/* ③ DB に問い合わせ */
	const localeInfo = await fetchLocaleInfoByPageSlug(pageSlug);
	if (!localeInfo) {
		return NextResponse.json({ message: "page not found" }, { status: 404 });
	}

	return NextResponse.json(localeInfo, { status: 200 });
}
