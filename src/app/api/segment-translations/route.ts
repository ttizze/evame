import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth-server";

const schema = z.object({
	segmentId: z.coerce.number().int(),
	userLocale: z.string(),
	bestTranslationId: z.coerce.number().int(),
});

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const validation = schema.safeParse(Object.fromEntries(searchParams));

	if (!validation.success) {
		return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const { segmentId, userLocale, bestTranslationId } = validation.data;
	const currentUser = await getCurrentUser();

	try {
		// 1クエリで全翻訳を取得
		const allTranslations = await db
			.selectFrom("segmentTranslations as st")
			.innerJoin("users as u", "st.userId", "u.id")
			.leftJoin("translationVotes as tv", (join) =>
				join
					.onRef("tv.translationId", "=", "st.id")
					.on("tv.userId", "=", currentUser?.id ?? ""),
			)
			.select([
				"st.id",
				"st.locale",
				"st.text",
				"st.point",
				"st.createdAt",
				"u.id as userId",
				"u.name",
				"u.handle",
				"u.image",
				"u.createdAt as userCreatedAt",
				"u.updatedAt as userUpdatedAt",
				"u.profile",
				"u.twitterHandle",
				"u.totalPoints",
				"u.isAi",
				"u.plan",
				"tv.isUpvote as voteIsUpvote",
				"tv.translationId as voteTranslationId",
				"tv.userId as voteUserId",
			])
			.where("st.segmentId", "=", segmentId)
			.where("st.locale", "=", userLocale)
			.orderBy("st.point", "desc")
			.orderBy("st.createdAt", "desc")
			.execute();

		// best と others に分離
		const best = allTranslations.find((t) => t.id === bestTranslationId);
		const others = allTranslations.filter((t) => t.id !== bestTranslationId);

		// 投票情報を抽出するヘルパー
		const extractVote = (t: (typeof allTranslations)[number]) =>
			currentUser?.id && t.voteTranslationId
				? {
						isUpvote: t.voteIsUpvote ?? false,
						translationId: t.voteTranslationId,
						userId: t.voteUserId ?? currentUser.id,
					}
				: null;

		return NextResponse.json({
			bestTranslation: best
				? {
						id: best.id,
						text: best.text,
						point: best.point,
						createdAt: best.createdAt.toISOString(),
					}
				: null,
			bestTranslationCurrentUserVote: best ? extractVote(best) : null,
			bestTranslationUser: best
				? {
						id: best.userId,
						name: best.name,
						handle: best.handle,
						image: best.image,
						createdAt: best.userCreatedAt,
						updatedAt: best.userUpdatedAt,
						profile: best.profile,
						twitterHandle: best.twitterHandle,
						totalPoints: best.totalPoints,
						isAi: best.isAi,
						plan: best.plan,
					}
				: null,
			translations: others.map((t) => ({
				id: t.id,
				locale: t.locale,
				text: t.text,
				point: t.point,
				createdAt: t.createdAt.toISOString(),
				user: { handle: t.handle, name: t.name, image: t.image },
				currentUserVote: extractVote(t),
			})),
		});
	} catch (error) {
		console.error("Error fetching translations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch translations" },
			{ status: 500 },
		);
	}
}
