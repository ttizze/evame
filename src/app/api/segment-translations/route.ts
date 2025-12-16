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
		// ベスト翻訳を取得（ユーザー情報と現在のユーザーの投票情報を含む）
		let bestTranslationQuery = db
			.selectFrom("segmentTranslations")
			.innerJoin("users", "segmentTranslations.userId", "users.id")
			.select([
				"segmentTranslations.id",
				"segmentTranslations.segmentId",
				"segmentTranslations.locale",
				"segmentTranslations.text",
				"segmentTranslations.point",
				"segmentTranslations.createdAt",
				"segmentTranslations.userId",
				"users.id as usersId",
				"users.name",
				"users.handle",
				"users.image",
				"users.createdAt as userCreatedAt",
				"users.updatedAt as userUpdatedAt",
				"users.profile",
				"users.twitterHandle",
				"users.totalPoints",
				"users.isAi",
				"users.plan",
			]);

		if (currentUser?.id) {
			bestTranslationQuery = bestTranslationQuery
				.leftJoin("translationVotes", (join) =>
					join
						.onRef(
							"translationVotes.translationId",
							"=",
							"segmentTranslations.id",
						)
						.on("translationVotes.userId", "=", currentUser.id),
				)
				.select([
					"translationVotes.isUpvote as voteIsUpvote",
					"translationVotes.translationId as voteTranslationId",
					"translationVotes.userId as voteUserId",
				]);
		}

		// スコープ検証: bestTranslationId が指定 segmentId/userLocale に属することを確認
		const bestTranslationWithVote = await bestTranslationQuery
			.where("segmentTranslations.id", "=", bestTranslationId)
			.where("segmentTranslations.segmentId", "=", segmentId)
			.where("segmentTranslations.locale", "=", userLocale)
			.executeTakeFirst();

		// その他の翻訳を取得
		let translationsQuery = db
			.selectFrom("segmentTranslations")
			.innerJoin("users", "segmentTranslations.userId", "users.id")
			.select([
				"segmentTranslations.id",
				"segmentTranslations.locale",
				"segmentTranslations.text",
				"segmentTranslations.point",
				"segmentTranslations.createdAt",
				"users.handle",
				"users.name",
				"users.image",
			]);

		if (currentUser?.id) {
			translationsQuery = translationsQuery
				.leftJoin("translationVotes", (join) =>
					join
						.onRef(
							"translationVotes.translationId",
							"=",
							"segmentTranslations.id",
						)
						.on("translationVotes.userId", "=", currentUser.id),
				)
				.select([
					"translationVotes.isUpvote as voteIsUpvote",
					"translationVotes.translationId as voteTranslationId",
					"translationVotes.userId as voteUserId",
				]);
		}

		const translations = await translationsQuery
			.where("segmentTranslations.segmentId", "=", segmentId)
			.where("segmentTranslations.locale", "=", userLocale)
			.where("segmentTranslations.id", "!=", bestTranslationId)
			.orderBy("segmentTranslations.point", "desc")
			.orderBy("segmentTranslations.createdAt", "desc")
			.execute();

		return NextResponse.json({
			bestTranslationCurrentUserVote:
				currentUser?.id &&
				bestTranslationWithVote &&
				"voteIsUpvote" in bestTranslationWithVote &&
				bestTranslationWithVote.voteTranslationId
					? {
							isUpvote: bestTranslationWithVote.voteIsUpvote,
							translationId: bestTranslationWithVote.voteTranslationId,
							userId: bestTranslationWithVote.voteUserId,
						}
					: null,
			bestTranslationUser: bestTranslationWithVote
				? {
						id: bestTranslationWithVote.usersId,
						name: bestTranslationWithVote.name,
						handle: bestTranslationWithVote.handle,
						image: bestTranslationWithVote.image,
						createdAt: bestTranslationWithVote.userCreatedAt,
						updatedAt: bestTranslationWithVote.userUpdatedAt,
						profile: bestTranslationWithVote.profile,
						twitterHandle: bestTranslationWithVote.twitterHandle,
						totalPoints: bestTranslationWithVote.totalPoints,
						isAI: bestTranslationWithVote.isAi,
						plan: bestTranslationWithVote.plan,
					}
				: null,
			translations: translations.map((t) => ({
				id: t.id,
				locale: t.locale,
				text: t.text,
				point: t.point,
				createdAt: t.createdAt.toISOString(),
				user: {
					handle: t.handle,
					name: t.name,
					image: t.image,
				},
				currentUserVote:
					currentUser?.id &&
					"voteIsUpvote" in t &&
					(t as { voteTranslationId?: number }).voteTranslationId
						? {
								isUpvote: (t as { voteIsUpvote: boolean }).voteIsUpvote,
								translationId: (t as { voteTranslationId: number })
									.voteTranslationId,
								userId: (t as { voteUserId: string }).voteUserId,
							}
						: null,
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
