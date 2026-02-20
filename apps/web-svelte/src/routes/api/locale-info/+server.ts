import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { fetchLocaleInfoByPageSlug } from "@/app/api/locale-info/_db/queries.server";

const Params = z.object({
	pageSlug: z.string(),
});

export const GET: RequestHandler = async ({ url }) => {
	const parseResult = Params.safeParse(Object.fromEntries(url.searchParams));

	if (!parseResult.success) {
		return json({ message: "pageSlug is required" }, { status: 400 });
	}

	const { pageSlug } = parseResult.data;
	const localeInfo = await fetchLocaleInfoByPageSlug(pageSlug);
	if (!localeInfo) {
		return json({ message: "page not found" }, { status: 404 });
	}

	return json(localeInfo, { status: 200 });
};
