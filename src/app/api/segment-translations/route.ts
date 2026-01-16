import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/_service/auth-server";
import { segmentTranslationSchema } from "@/app/api/segment-translations/_domain/segment-translations";
import { db } from "@/db";

const schema = z.object({
	segmentId: z.coerce.number().int(),
	userLocale: z.string(),
});

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const validation = schema.safeParse(Object.fromEntries(searchParams));

	if (!validation.success) {
		return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const { segmentId, userLocale } = validation.data;
	const currentUser = await getCurrentUser();

	try {
		// 1クエリで全翻訳を取得
		// ページとコメントの両方に対応するため、LEFT JOINでオーナーを取得
		// ページオーナーのupvoteとコメントオーナーのupvoteを別々にJOINし、どちらかがあれば優先
		const translations = await db
			.selectFrom("segmentTranslations as st")
			.innerJoin("segments as s", "st.segmentId", "s.id")
			.leftJoin("pages as p", "s.contentId", "p.id")
			.leftJoin("pageComments as c", "s.contentId", "c.id")
			.innerJoin("users as u", "st.userId", "u.id")
			.leftJoin("translationVotes as tv", (join) =>
				join
					.onRef("tv.translationId", "=", "st.id")
					.on("tv.userId", "=", currentUser?.id ?? ""),
			)
			// ページオーナーのupvote
			.leftJoin("translationVotes as pageOwnerTv", (join) =>
				join
					.onRef("pageOwnerTv.translationId", "=", "st.id")
					.onRef("pageOwnerTv.userId", "=", "p.userId")
					.on("pageOwnerTv.isUpvote", "=", true),
			)
			// コメントオーナーのupvote
			.leftJoin("translationVotes as commentOwnerTv", (join) =>
				join
					.onRef("commentOwnerTv.translationId", "=", "st.id")
					.onRef("commentOwnerTv.userId", "=", "c.userId")
					.on("commentOwnerTv.isUpvote", "=", true),
			)
			.select((eb) => [
				"st.id",
				"st.segmentId",
				"st.locale",
				"st.text",
				"st.point",
				"st.createdAt",
				"u.name as userName",
				"u.handle as userHandle",
				"tv.isUpvote as currentUserVoteIsUpvote",
				// どちらかのオーナーがupvoteしていればtrue
				eb.fn
					.coalesce("pageOwnerTv.isUpvote", "commentOwnerTv.isUpvote")
					.as("ownerUpvote"),
			])
			.where("st.segmentId", "=", segmentId)
			.where("st.locale", "=", userLocale)
			.orderBy("ownerUpvote", (ob) => ob.desc().nullsLast())
			.orderBy("st.point", "desc")
			.orderBy("st.createdAt", "desc")
			.execute();

		const response = segmentTranslationSchema.array().parse(translations);
		return NextResponse.json(response);
	} catch (error) {
		console.error("Error fetching translations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch translations" },
			{ status: 500 },
		);
	}
}
