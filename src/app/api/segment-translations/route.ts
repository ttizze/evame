import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth-server";
import { segmentTranslationSchema } from "@/lib/schemas/segment-translations";

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
		const translations = await db
			.selectFrom("segmentTranslations as st")
			.innerJoin("users as u", "st.userId", "u.id")
			.leftJoin("translationVotes as tv", (join) =>
				join
					.onRef("tv.translationId", "=", "st.id")
					.on("tv.userId", "=", currentUser?.id ?? ""),
			)
			.select([
				"st.id",
				"st.segmentId",
				"st.locale",
				"st.text",
				"st.point",
				"st.createdAt",
				"u.name as userName",
				"u.handle as userHandle",
				"tv.isUpvote as currentUserVoteIsUpvote",
			])
			.where("st.segmentId", "=", segmentId)
			.where("st.locale", "=", userLocale)
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
