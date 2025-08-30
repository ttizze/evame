import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { selectUserFields } from "@/app/[locale]/_db/queries.server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

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
	console.log("userLocale", userLocale);

	try {
		const bestTranslationWithVote = await prisma.segmentTranslation.findUnique({
			where: { id: bestTranslationId, locale: userLocale },
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
		console.log("bestTranslationWithVote", bestTranslationWithVote);

		// その他の翻訳を取得
		const translations = await prisma.segmentTranslation.findMany({
			where: {
				segmentId,
				locale: userLocale,
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
	} catch (error) {
		console.error("Error fetching translations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch translations" },
			{ status: 500 },
		);
	}
}
