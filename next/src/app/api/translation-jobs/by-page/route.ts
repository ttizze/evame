// src/app/api/page-translations/info/route.ts
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pickBestPerLocale } from "./_lib/pick-best-per-locale";
export async function GET(req: NextRequest) {
	const pageId = z.coerce
		.number()
		.int()
		.positive()
		.parse(req.nextUrl.searchParams.get("pageId"));
	const page = await prisma.page.findUnique({
		where: { id: pageId },
		select: { sourceLocale: true },
	});
	if (!page)
		return NextResponse.json({ message: "not found" }, { status: 404 });

	const jobs = await prisma.translationJob.findMany({
		where: { pageId },
	});
	const bestJobs = pickBestPerLocale(jobs); // Aパターンの関数
	return NextResponse.json(
		{ sourceLocale: page.sourceLocale, translationJobs: bestJobs },
		{ status: 200, headers: { "Cache-Control": "private, no-store" } },
	);
}
