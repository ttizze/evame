import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pickBestPerLocale } from "./_lib/pick-best-per-locale";

export async function GET(req: NextRequest) {
	/* ① クエリパラメータを 1 回でバリデート */
	const Params = z
		.object({
			pageSlug: z.string().optional(),
			projectSlug: z.string().optional(),
		})
		.refine((p) => p.pageSlug || p.projectSlug, {
			message: "pageSlug or projectSlug is required",
		});

	/* ② ここでパース失敗なら 400 を返す */
	const { pageSlug, projectSlug } = Params.parse(
		Object.fromEntries(req.nextUrl.searchParams),
	);

	/* ③ 片方だけを使って DB に問い合わせ */
	if (pageSlug) {
		const page = await prisma.page.findUnique({
			where: { slug: pageSlug },
			select: { sourceLocale: true, translationJobs: true },
		});
		if (!page)
			return NextResponse.json({ message: "page not found" }, { status: 404 });

		return NextResponse.json(
			{
				sourceLocale: page.sourceLocale,
				translationJobs: pickBestPerLocale(page.translationJobs),
			},
			{ status: 200 },
		);
	}

	if (projectSlug) {
		const project = await prisma.project.findUnique({
			where: { slug: projectSlug },
			select: { sourceLocale: true, translationJobs: true },
		});
		if (!project)
			return NextResponse.json(
				{ message: "project not found" },
				{ status: 404 },
			);

		return NextResponse.json(
			{
				sourceLocale: project.sourceLocale,
				translationJobs: pickBestPerLocale(project.translationJobs),
			},
			{ status: 200 },
		);
	}

	return NextResponse.json(
		{ message: "pageSlug or projectSlug is required" },
		{ status: 400 },
	);
}
