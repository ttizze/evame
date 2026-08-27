import { NextResponse } from "next/server";
import { db } from "@/db";

function parsePageIds(idsParam: string | null): number[] | null {
	if (!idsParam) {
		return null;
	}

	const ids = Array.from(
		new Set(
			idsParam
				.split(",")
				.map((id) => Number(id.trim()))
				.filter((id) => Number.isInteger(id) && id > 0),
		),
	);

	if (ids.length === 0) {
		return null;
	}

	return ids;
}

export async function GET(request: Request) {
	const pageIds = parsePageIds(new URL(request.url).searchParams.get("ids"));
	if (!pageIds) {
		return NextResponse.json(
			{ error: "ids query parameter is required" },
			{ status: 400 },
		);
	}

	const rows = await db
		.selectFrom("pageViews")
		.select(["pageId", "count"])
		.where("pageId", "in", pageIds)
		.execute();

	const countByPageId = new Map(rows.map((row) => [row.pageId, row.count]));
	const counts = Object.fromEntries(
		pageIds.map((pageId) => [pageId, countByPageId.get(pageId) ?? 0]),
	);

	return NextResponse.json({ counts });
}
