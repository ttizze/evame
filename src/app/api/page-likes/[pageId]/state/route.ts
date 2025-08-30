import { NextResponse } from "next/server";
import { getPageLikeAndCount } from "@/app/[locale]/_components/page/page-like-button/db/queries.server";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ pageId: string }> },
) {
	const { pageId } = await params;
	const id = Number(pageId);
	if (!Number.isFinite(id)) {
		return NextResponse.json({ error: "invalid pageId" }, { status: 400 });
	}

	const currentUser = await getCurrentUser();
	const { liked, likeCount } = await getPageLikeAndCount(
		id,
		currentUser?.id ?? "",
	);
	return NextResponse.json({ liked, likeCount });
}
