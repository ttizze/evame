import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { fetchTranslationJobsByIds } from "@/app/api/translation-jobs/_db/queries.server";
import { translationJobForToastSchema } from "@/app/types/translation-job";

export const GET: RequestHandler = async ({ url }) => {
	const ids = z
		.array(z.coerce.number().int().positive())
		.parse(url.searchParams.getAll("id"));
	if (!ids.length) {
		return json(
			{ message: "at least one id query param is required" },
			{ status: 400 },
		);
	}

	const rows = await fetchTranslationJobsByIds(ids);
	const validatedRows = z.array(translationJobForToastSchema).parse(rows);
	return json(validatedRows, { status: 200 });
};
