import { z } from "zod";
import { translationJobForToastSchema } from "@/app/types/translation-job";
import { fetchTranslationJobsByIds } from "./_db/queries.server";

export async function getTranslationJobs(request: Request): Promise<Response> {
	const ids = z
		.array(z.coerce.number().int().positive())
		.parse(new URL(request.url).searchParams.getAll("id"));
	if (!ids.length) {
		return Response.json(
			{ message: "at least one id query param is required" },
			{ status: 400 },
		);
	}

	const rows = await fetchTranslationJobsByIds(ids);
	const validatedRows = z.array(translationJobForToastSchema).parse(rows);
	return Response.json(validatedRows, { status: 200 });
}
