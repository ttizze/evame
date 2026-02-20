import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { segmentTranslationSchema } from "@/app/api/segment-translations/_domain/segment-translations";
import { db } from "@/db";

const schema = z.object({
	segmentId: z.coerce.number().int(),
	userLocale: z.string(),
});

export const GET: RequestHandler = async ({ locals, url }) => {
	const validation = schema.safeParse(Object.fromEntries(url.searchParams));

	if (!validation.success) {
		return json({ error: "Invalid parameters" }, { status: 400 });
	}

	const { segmentId, userLocale } = validation.data;

	try {
		const translations = await db
			.selectFrom("segmentTranslations as st")
			.innerJoin("segments as s", "st.segmentId", "s.id")
			.leftJoin("pages as p", "s.contentId", "p.id")
			.leftJoin("pageComments as c", "s.contentId", "c.id")
			.innerJoin("users as u", "st.userId", "u.id")
			.leftJoin("translationVotes as tv", (join) =>
				join
					.onRef("tv.translationId", "=", "st.id")
					.on("tv.userId", "=", locals.user?.id ?? ""),
			)
			.leftJoin("translationVotes as pageOwnerTv", (join) =>
				join
					.onRef("pageOwnerTv.translationId", "=", "st.id")
					.onRef("pageOwnerTv.userId", "=", "p.userId")
					.on("pageOwnerTv.isUpvote", "=", true),
			)
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
		return json(response);
	} catch (error) {
		console.error("Error fetching translations:", error);
		return json({ error: "Failed to fetch translations" }, { status: 500 });
	}
};
