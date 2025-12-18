import "dotenv/config";

import { createId } from "@paralleldrive/cuid2";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import type { JsonValue } from "@/db/types";
import { db } from ".";
import { LOCALE_CONTENT } from "./seed-data/content";

type LocaleKey = keyof typeof LOCALE_CONTENT;

type SegmentKey =
	| { kind: "heroHeader" }
	| { kind: "heroText" }
	| { kind: "ourProblemHeader" }
	| { kind: "sectionHeader"; index: number }
	| { kind: "sectionText"; index: number };

const SEGMENT_KEYS: SegmentKey[] = (() => {
	const sampleLocale = LOCALE_CONTENT.en;
	const sectionsCount = sampleLocale.sections.length;
	const keys: SegmentKey[] = [
		{ kind: "heroHeader" },
		{ kind: "heroText" },
		{ kind: "ourProblemHeader" },
	];
	for (let i = 0; i < sectionsCount; i += 1) {
		keys.push({ kind: "sectionHeader", index: i });
		keys.push({ kind: "sectionText", index: i });
	}
	return keys;
})();

const EN_TRANSLATIONS: LocaleKey[] = ["ja", "zh", "ko", "es"];
const JA_TRANSLATIONS: LocaleKey[] = ["en", "zh", "ko", "es"];

async function seed() {
	// 必要なシードのみ挿入する
	const primarySegmentTypeId = await ensurePrimarySegmentType();
	const evameUserId = await ensureEvameUser();
	const { evameEnPageId, evameJaPageId } = await ensurePages(evameUserId);

	const segmentsByPage: { pageId: number; segments: SegmentData[] }[] = [
		{
			pageId: evameEnPageId,
			segments: buildSegmentsForLocale("en", EN_TRANSLATIONS),
		},
		{
			pageId: evameJaPageId,
			segments: buildSegmentsForLocale("ja", JA_TRANSLATIONS),
		},
	];

	for (const { pageId, segments } of segmentsByPage) {
		await upsertSegmentsWithTranslations({
			pageId,
			segments,
			segmentTypeId: primarySegmentTypeId,
			userId: evameUserId,
		});
	}

	console.log("Seed completed");
}

interface SegmentData {
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	translations: Record<string, string>;
}

async function ensurePrimarySegmentType(): Promise<number> {
	// PRIMARY がなければ作る。あれば ID を返す。
	const result = await db
		.insertInto("segmentTypes")
		.values({ key: "PRIMARY", label: "Primary" })
		.onConflict((oc) =>
			oc.columns(["key", "label"]).doUpdateSet({ label: "Primary" }),
		)
		.returning("id")
		.executeTakeFirstOrThrow();

	return result.id;
}

async function ensureEvameUser(): Promise<string> {
	const result = await db
		.insertInto("users")
		.values({
			id: createId(),
			handle: "evame",
			name: "evame",
			provider: "Admin",
			image: "https://evame.tech/favicon.svg",
			email: "evame@evame.tech",
			profile: "",
			twitterHandle: "",
			plan: "free",
			totalPoints: 0,
			isAi: false,
		})
		.onConflict((oc) => oc.column("handle").doUpdateSet({ handle: "evame" }))
		.returning("id")
		.executeTakeFirstOrThrow();

	return result.id;
}

async function ensurePages(userId: string) {
	const evameEnPageId = await upsertPage({
		slug: "evame",
		sourceLocale: "en",
		content: LOCALE_CONTENT.en.heroHeader,
		aiLocales: EN_TRANSLATIONS,
		userId,
	});

	const evameJaPageId = await upsertPage({
		slug: "evame-ja",
		sourceLocale: "ja",
		content: LOCALE_CONTENT.ja.heroHeader,
		aiLocales: JA_TRANSLATIONS,
		userId,
	});

	return { evameEnPageId, evameJaPageId };
}

async function upsertPage(params: {
	slug: string;
	sourceLocale: string;
	content: string;
	aiLocales: string[];
	userId: string;
}): Promise<number> {
	return await db.transaction().execute(async (tx) => {
		const page = await tx
			.insertInto("pages")
			.values({
				id: (
					await tx
						.insertInto("contents")
						.values({ kind: "PAGE", importFileId: null })
						.returning("id")
						.executeTakeFirstOrThrow()
				).id,
				slug: params.slug,
				sourceLocale: params.sourceLocale,
				mdastJson: buildMdastJson(params.content),
				status: "DRAFT",
				userId: params.userId,
				order: 0,
				parentId: null,
			})
			.onConflict((oc) =>
				oc.column("slug").doUpdateSet({
					sourceLocale: params.sourceLocale,
					mdastJson: buildMdastJson(params.content),
					status: "DRAFT",
				}),
			)
			.returning("id")
			.executeTakeFirstOrThrow();

		await insertTranslationJobs(tx, page.id, params.aiLocales);
		return page.id;
	});
}

function buildMdastJson(text: string): JsonValue {
	return {
		type: "root",
		children: [
			{ type: "paragraph", children: [{ type: "text", value: text }] },
		],
	};
}

async function insertTranslationJobs(
	tx: TransactionClient,
	pageId: number,
	locales: string[],
) {
	if (!locales.length) return;

	for (const locale of locales) {
		const existing = await tx
			.selectFrom("translationJobs")
			.select("id")
			.where("pageId", "=", pageId)
			.where("locale", "=", locale)
			.executeTakeFirst();

		if (!existing) {
			await tx
				.insertInto("translationJobs")
				.values({
					pageId,
					userId: null,
					locale,
					aiModel: "test-model",
					status: "COMPLETED",
					progress: 0,
					error: "",
				})
				.execute();
		}
	}
}

function getLocalizedText(locale: LocaleKey, key: SegmentKey): string {
	const content = LOCALE_CONTENT[locale];
	if (!content) {
		throw new Error(`Locale content not found for ${locale}`);
	}
	switch (key.kind) {
		case "heroHeader":
			return content.heroHeader;
		case "heroText":
			return content.heroText;
		case "ourProblemHeader":
			return content.ourProblemHeader;
		case "sectionHeader":
			if (!content.sections[key.index]) {
				throw new Error(
					`Missing section header for locale ${locale} index ${key.index}`,
				);
			}
			return content.sections[key.index].header;
		case "sectionText":
			if (!content.sections[key.index]) {
				throw new Error(
					`Missing section text for locale ${locale} index ${key.index}`,
				);
			}
			return content.sections[key.index].text;
	}
}

function buildSegmentsForLocale(
	locale: LocaleKey,
	translations: LocaleKey[],
): SegmentData[] {
	return SEGMENT_KEYS.map((key, index) => {
		const text = getLocalizedText(locale, key);
		const translationsMap = Object.fromEntries(
			translations.map((target) => [target, getLocalizedText(target, key)]),
		);
		return {
			number: index,
			text,
			textAndOccurrenceHash: `evame-${locale}-segment-${index}`,
			translations: translationsMap,
		};
	});
}

async function upsertSegmentsWithTranslations(params: {
	pageId: number;
	segments: SegmentData[];
	segmentTypeId: number;
	userId: string;
}) {
	for (const segment of params.segments) {
		const seg = await db
			.insertInto("segments")
			.values({
				contentId: params.pageId,
				number: segment.number,
				text: segment.text,
				textAndOccurrenceHash: segment.textAndOccurrenceHash,
				segmentTypeId: params.segmentTypeId,
			})
			.onConflict((oc) =>
				oc.columns(["contentId", "number"]).doUpdateSet({
					text: segment.text,
					textAndOccurrenceHash: segment.textAndOccurrenceHash,
					segmentTypeId: params.segmentTypeId,
				}),
			)
			.returning("id")
			.executeTakeFirstOrThrow();

		for (const [locale, text] of Object.entries(segment.translations)) {
			const existing = await db
				.selectFrom("segmentTranslations")
				.select("id")
				.where("segmentId", "=", seg.id)
				.where("locale", "=", locale)
				.executeTakeFirst();

			if (existing) {
				await db
					.updateTable("segmentTranslations")
					.set({ text, userId: params.userId })
					.where("id", "=", existing.id)
					.execute();
			} else {
				await db
					.insertInto("segmentTranslations")
					.values({
						segmentId: seg.id,
						locale,
						text,
						userId: params.userId,
						point: 0,
					})
					.execute();
			}
		}
	}
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		// プールを閉じる
		if (db.pool) {
			await db.pool.end();
		}
	});
