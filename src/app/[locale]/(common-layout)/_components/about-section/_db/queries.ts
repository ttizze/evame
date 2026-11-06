import { bestTranslationId } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";

export function queryAboutPage(pageSlug: string, locale: string) {
	return db
		.selectFrom("pages")
		.leftJoin("segments", "segments.contentId", "pages.id")
		.leftJoin("segmentTranslations as trans", (join) =>
			join.on("trans.id", "=", (eb) =>
				bestTranslationId(
					eb.ref("segments.id").$notNull(),
					eb.ref("pages.userId"),
					locale,
				),
			),
		)
		.select([
			"pages.sourceLocale",
			"segments.id",
			"segments.contentId",
			"segments.number",
			"segments.text",
			"trans.text as translationText",
		])
		.where("pages.slug", "=", pageSlug)
		.where("pages.status", "!=", "ARCHIVE")
		.orderBy("segments.number", "asc")
		.execute();
}

export function querySocialProofStats() {
	return db
		.selectNoFrom((eb) => [
			eb
				.selectFrom("pages")
				.select(eb.fn.countAll<number>().as("count"))
				.where("status", "=", "PUBLIC")
				.where("parentId", "is", null)
				.as("articles"),
			eb
				.selectFrom("segmentTranslations")
				// 翻訳の存在する段落だけを辿り、未翻訳の全段落の走査を避ける。
				.crossJoin("segments")
				.crossJoin("pages")
				.whereRef("segmentTranslations.segmentId", "=", "segments.id")
				.whereRef("segments.contentId", "=", "pages.id")
				.where("pages.status", "=", "PUBLIC")
				.where("pages.parentId", "is", null)
				.select(eb.fn.countAll<number>().as("count"))
				.as("translations"),
			eb.val(18).as("languages"),
		])
		.$narrowType<{ articles: number; translations: number }>();
}
