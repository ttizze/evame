import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchChildPages } from "@/app/[locale]/_db/page-list.server";

export async function GET(req: NextRequest) {
	const Params = z
		.object({
			parentId: z.coerce.number(),
			locale: z.string(),
		})
		.refine((p) => !Number.isNaN(p.parentId), {
			message: "parentId must be a number",
		});

	const { parentId, locale } = Params.parse(
		Object.fromEntries(req.nextUrl.searchParams),
	);

	const children = await fetchChildPages(parentId, locale);
	return NextResponse.json(children);
}
