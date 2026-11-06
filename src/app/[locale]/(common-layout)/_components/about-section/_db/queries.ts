import { db } from "@/db";

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
		.$narrowType<{ articles: number; translations: number }>()
		.executeTakeFirstOrThrow();
}
