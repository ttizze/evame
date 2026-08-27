import { sql } from "kysely";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import type { PageStatus } from "@/db/types";

const LANGUAGE_COUNT = 18;

export async function fetchSocialProofStats() {
	"use cache";
	cacheLife({ expire: 60 * 60 * 12 });
	cacheTag("top:social-proof-stats");

	const articlesResult = await db
		.selectFrom("pages")
		.select(sql<number>`count(*)::int`.as("count"))
		.where("status", "=", "PUBLIC" satisfies PageStatus)
		.where("parentId", "is", null)
		.executeTakeFirst();

	const translationsResult = await db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
		.innerJoin("pages", "segments.contentId", "pages.id")
		.select(sql<number>`count(*)::int`.as("count"))
		.where("pages.status", "=", "PUBLIC" satisfies PageStatus)
		.where("pages.parentId", "is", null)
		.executeTakeFirst();

	return {
		articles: Number(articlesResult?.count ?? 0),
		translations: Number(translationsResult?.count ?? 0),
		languages: LANGUAGE_COUNT,
	};
}
