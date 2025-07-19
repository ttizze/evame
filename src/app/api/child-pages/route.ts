import { type NextRequest, NextResponse } from "next/server";
import { fetchChildPages } from "@/app/[locale]/_db/page-queries.server";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const parentIdParam = searchParams.get("parentId");
	const locale = searchParams.get("locale") ?? "en";
	if (!parentIdParam) {
		return NextResponse.json(
			{ error: "parentId is required" },
			{ status: 400 },
		);
	}
	const parentId = Number(parentIdParam);
	if (Number.isNaN(parentId)) {
		return NextResponse.json(
			{ error: "parentId must be number" },
			{ status: 400 },
		);
	}
	try {
		const children = await fetchChildPages(parentId, locale);
		return NextResponse.json(children);
	} catch (err) {
		console.error(err);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
