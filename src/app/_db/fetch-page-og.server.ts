import { bestTranslationByPagesSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";

export async function fetchPageOgData(slug: string, locale: string) {
	const page = await db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.leftJoin(
			(eb) =>
				eb
					.selectFrom("segments")
					.distinctOn("segments.contentId")
					.select([
						"segments.contentId",
						"segments.id as segmentId",
						"segments.text as segmentText",
					])
					.where("segments.number", "=", 0)
					.orderBy("segments.contentId")
					.orderBy("segments.id")
					.as("titleSegments"),
			(join) => join.onRef("titleSegments.contentId", "=", "pages.id"),
		)
		.leftJoin(bestTranslationByPagesSubquery(locale).as("trans"), (join) =>
			join.onRef("trans.segmentId", "=", "titleSegments.segmentId"),
		)
		.select([
			"pages.id",
			"users.handle as userHandle",
			"users.name as userName",
			"titleSegments.segmentText",
			"trans.text as translationText",
		])
		.where("pages.slug", "=", slug)
		.where("pages.status", "!=", "ARCHIVE")
		.executeTakeFirst();

	if (!page) {
		return null;
	}

	const title = page.translationText
		? `${page.segmentText ?? ""} - ${page.translationText}`
		: (page.segmentText ?? "");

	return {
		id: page.id,
		title,
		userHandle: page.userHandle,
		userName: page.userName,
	};
}
