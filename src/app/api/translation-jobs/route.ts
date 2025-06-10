import {
	type TranslationJobForToast,
	translationJobForToastSchema,
} from "@/app/types/translation-job";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/** クエリ id=1&id=2 … を number[] にする */
function parseIds(url: string): number[] {
	const ids = new URL(url).searchParams.getAll("id");
	const schema = z.array(z.coerce.number().int().positive());
	return schema.parse(ids);
}

export async function GET(
	request: NextRequest,
): Promise<NextResponse<TranslationJobForToast[] | { message: string }>> {
	const ids = parseIds(request.url);
	if (!ids.length) {
		return NextResponse.json(
			{ message: "at least one id query param is required" },
			{ status: 400 },
		);
	}

	const rows: TranslationJobForToast[] = await prisma.translationJob.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			locale: true,
			status: true,
			progress: true,
			error: true,
			page: {
				select: {
					slug: true,
					user: {
						select: {
							handle: true,
						},
					},
				},
			},
		},
	});

	const validatedRows = z.array(translationJobForToastSchema).parse(rows);
	return NextResponse.json(validatedRows, { status: 200 });
}
