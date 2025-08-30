import { NextResponse } from "next/server";
import { fetchPageViewCount } from "@/app/[locale]/_db/page-utility-queries.server";
import { incrementPageView } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_db/mutations.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ pageId: string }> },
) {
	const { pageId } = await params;
	const id = Number(pageId);
	if (!Number.isFinite(id)) {
		return NextResponse.json({ error: "invalid pageId" }, { status: 400 });
	}

	await incrementPageView(id);
	const count = await fetchPageViewCount(id);
	return NextResponse.json({ count });
}
