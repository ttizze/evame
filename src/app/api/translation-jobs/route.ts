import type { NextRequest } from "next/server";
import { z } from "zod";
import { translationJobForToastSchema } from "@/app/types/translation-job";
import { ApiErrors, apiSuccess } from "@/app/types/api-response";
import { fetchTranslationJobsByIds } from "./_db/queries.server";

export async function GET(request: NextRequest) {
	const ids = z
		.array(z.coerce.number().int().positive())
		.parse(new URL(request.url).searchParams.getAll("id"));
	if (!ids.length) {
		return ApiErrors.badRequest("at least one id query param is required");
	}

	const rows = await fetchTranslationJobsByIds(ids);
	const validatedRows = z.array(translationJobForToastSchema).parse(rows);
	return apiSuccess(validatedRows);
}
