import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
	type TranslationJobForToast,
	translationJobForToastSchema,
} from "@/app/types/translation-job";
import { fetchTranslationJobsByIds } from "./_db/queries.server";

export async function GET(
	request: NextRequest,
): Promise<NextResponse<TranslationJobForToast[] | { message: string }>> {
	const ids = z
		.array(z.coerce.number().int().positive())
		.parse(new URL(request.url).searchParams.getAll("id"));
	if (!ids.length) {
		return NextResponse.json(
			{ message: "at least one id query param is required" },
			{ status: 400 },
		);
	}

	const rows = await fetchTranslationJobsByIds(ids);
	const validatedRows = z.array(translationJobForToastSchema).parse(rows);
	return NextResponse.json(validatedRows, { status: 200 });
}
