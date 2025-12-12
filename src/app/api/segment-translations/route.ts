import { and, desc, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { selectUserFieldsDrizzle } from "@/app/[locale]/_db/queries.server";
import { db } from "@/drizzle";
import { segmentTranslations, translationVotes, users } from "@/drizzle/schema";
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
		const bestTranslationQuery = db
			.select({
				translation: segmentTranslations,
				user: selectUserFieldsDrizzle(),
				vote: translationVotes,
			})
			.from(segmentTranslations)
			.innerJoin(users, eq(segmentTranslations.userId, users.id))
			.$dynamic();

		// 現在のユーザーがログインしている場合のみ、投票情報をJOIN
		if (currentUser?.id) {
			bestTranslationQuery.leftJoin(
				translationVotes,
				and(
					eq(translationVotes.translationId, segmentTranslations.id),
					eq(translationVotes.userId, currentUser.id),
				),
			);
		}

		const bestTranslationResult = await bestTranslationQuery
			.where(eq(segmentTranslations.id, bestTranslationId))
			.limit(1);
		const bestTranslationWithVote = bestTranslationResult[0] ?? null;

		// その他の翻訳を取得
		const translationsQuery = db
			.select({
				translation: segmentTranslations,
				user: {
					handle: users.handle,
					name: users.name,
					image: users.image,
				},
				vote: translationVotes,
			})
			.from(segmentTranslations)
			.innerJoin(users, eq(segmentTranslations.userId, users.id))
			.$dynamic();

		// 現在のユーザーがログインしている場合のみ、投票情報をJOIN
		if (currentUser?.id) {
			translationsQuery.leftJoin(
				translationVotes,
				and(
					eq(translationVotes.translationId, segmentTranslations.id),
					eq(translationVotes.userId, currentUser.id),
				),
			);
		}

		const translations = await translationsQuery
			.where(
				and(
					eq(segmentTranslations.segmentId, segmentId),
					eq(segmentTranslations.locale, userLocale),
					ne(segmentTranslations.id, bestTranslationId),
				),
			)
			.orderBy(
				desc(segmentTranslations.point),
				desc(segmentTranslations.createdAt),
			);

		return NextResponse.json({
			bestTranslationCurrentUserVote:
				(currentUser?.id && bestTranslationWithVote?.vote) ?? null,
			bestTranslationUser: bestTranslationWithVote?.user ?? null,
			translations: translations.map((t) => ({
				id: t.translation.id,
				locale: t.translation.locale,
				text: t.translation.text,
				point: t.translation.point,
				createdAt: t.translation.createdAt.toISOString(),
				user: t.user,
				currentUserVote: (currentUser?.id && t.vote) ?? null,
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
