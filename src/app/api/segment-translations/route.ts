import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { selectUserFields } from "@/app/[locale]/_db/queries.server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
	segmentId: z.coerce.number().int(),
	targetContentType: z.enum(["page", "pageComment"]),
	locale: z.string(),
	bestTranslationId: z.coerce.number().int(),
});

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const validation = schema.safeParse(Object.fromEntries(searchParams));

	if (!validation.success) {
		return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const { segmentId, targetContentType, locale, bestTranslationId } =
		validation.data;
	const currentUser = await getCurrentUser();

	try {
		if (targetContentType === "page") {
			// bestTranslationの投票情報とユーザー情報を取得
			const bestTranslationWithVote =
				await prisma.pageSegmentTranslation.findUnique({
					where: { id: bestTranslationId },
					include: {
						user: {
							select: selectUserFields(),
						},
						...(currentUser?.id && {
							votes: {
								where: { userId: currentUser.id },
							},
						}),
					},
				});

			// その他の翻訳を取得
			const translations = await prisma.pageSegmentTranslation.findMany({
				where: {
					pageSegmentId: segmentId,
					locale,
					isArchived: false,
					id: { not: bestTranslationId },
				},
				include: {
					user: {
						select: {
							handle: true,
							name: true,
							image: true,
						},
					},
					...(currentUser?.id && {
						votes: {
							where: { userId: currentUser.id },
						},
					}),
				},
				orderBy: [{ point: "desc" }, { createdAt: "desc" }],
			});

			return NextResponse.json({
				bestTranslationCurrentUserVote:
					bestTranslationWithVote?.votes?.[0] ?? null,
				bestTranslationUser: bestTranslationWithVote?.user ?? null,
				translations: translations.map((t) => ({
					id: t.id,
					locale: t.locale,
					text: t.text,
					point: t.point,
					createdAt: t.createdAt.toISOString(),
					user: t.user,
					currentUserVote: t.votes?.[0] ?? null,
				})),
			});
		} else {
			// bestTranslationの投票情報とユーザー情報を取得
			const bestTranslationWithVote =
				await prisma.pageCommentSegmentTranslation.findUnique({
					where: { id: bestTranslationId },
					include: {
						user: {
							select: {
								handle: true,
								name: true,
								image: true,
							},
						},
						...(currentUser?.id && {
							pageCommentSegmentTranslationVotes: {
								where: { userId: currentUser.id },
							},
						}),
					},
				});

			// その他の翻訳を取得
			const translations = await prisma.pageCommentSegmentTranslation.findMany({
				where: {
					pageCommentSegmentId: segmentId,
					locale,
					id: { not: bestTranslationId },
				},
				include: {
					user: {
						select: {
							handle: true,
							name: true,
							image: true,
						},
					},
					...(currentUser?.id && {
						pageCommentSegmentTranslationVotes: {
							where: { userId: currentUser.id },
						},
					}),
				},
				orderBy: [{ point: "desc" }, { createdAt: "desc" }],
			});

			return NextResponse.json({
				bestTranslationCurrentUserVote:
					bestTranslationWithVote?.pageCommentSegmentTranslationVotes?.[0] ??
					null,
				bestTranslationUser: bestTranslationWithVote?.user ?? null,
				translations: translations.map((t) => ({
					id: t.id,
					locale: t.locale,
					text: t.text,
					point: t.point,
					createdAt: t.createdAt.toISOString(),
					user: t.user,
					currentUserVote: t.pageCommentSegmentTranslationVotes?.[0] ?? null,
				})),
			});
		}
	} catch (error) {
		console.error("Error fetching translations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch translations" },
			{ status: 500 },
		);
	}
}
