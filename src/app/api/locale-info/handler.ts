import { z } from "zod";
import { fetchLocaleInfoByPageSlug } from "./_db/queries.server";

export async function getLocaleInfo(request: Request): Promise<Response> {
	const params = z.object({
		pageSlug: z.string(),
	});

	const parseResult = params.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);

	if (!parseResult.success) {
		return Response.json({ message: "pageSlug is required" }, { status: 400 });
	}

	const localeInfo = await fetchLocaleInfoByPageSlug(parseResult.data.pageSlug);
	if (!localeInfo) {
		return Response.json({ message: "page not found" }, { status: 404 });
	}

	return Response.json(localeInfo, { status: 200 });
}
