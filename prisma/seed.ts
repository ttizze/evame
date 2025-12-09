import "dotenv/config";

import { Kysely, PostgresDialect, sql } from "kysely";
import type { DB } from "kysely-codegen";
// pg は ESM ではデフォルトエクスポートから取り出す必要がある
import pg from "pg";
import { LOCALE_CONTENT } from "./seed-data/content";

const { Pool } = pg;

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

const db = new Kysely<DB>({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: process.env.DATABASE_URL,
		}),
	}),
});

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

interface TranslationInput {
	locale: string;
	text: string;
	userId: string;
}

interface SegmentData {
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	translations: Record<string, string>;
}

async function ensurePrimarySegmentType(): Promise<number> {
	// PRIMARY がなければ作る。あれば ID を返す。
	const existing = await db
		.selectFrom("segmentTypes")
		.select(["id"])
		.where("key", "=", "PRIMARY")
		.executeTakeFirst();

	if (existing) return existing.id;

	const inserted = await db
		.insertInto("segmentTypes")
		.values({ key: "PRIMARY", label: "Primary" })
		.returning("id")
		.executeTakeFirst();

	if (!inserted?.id) {
			throw new Error("failed to insert segmentTypes.PRIMARY");
	}
	return inserted.id;
}

async function ensureEvameUser(): Promise<string> {
	const existing = await db
		.selectFrom("users")
		.select(["id"])
		.where("handle", "=", "evame")
		.executeTakeFirst();

	if (existing) {
		// 必要項目だけ更新
		await db
			.updateTable("users")
			.set({
				provider: "Admin",
				image: "https://evame.tech/favicon.svg",
			})
			.where("id", "=", existing.id)
			.execute();
		return existing.id;
	}

	const inserted = await db
		.insertInto("users")
		.values({
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
		.returning("id")
		.executeTakeFirst();

	if (!inserted?.id) throw new Error("failed to insert user evame");
	return inserted.id;
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
	const existing = await db
		.selectFrom("pages")
		.select(["id"])
		.where("slug", "=", params.slug)
		.executeTakeFirst();

	if (existing) {
		await db
			.updateTable("pages")
			.set({
				sourceLocale: params.sourceLocale,
				// mdast_json は JSONB カラムのためプレーン文字列は入らない
				mdastJson: buildMdastJson(params.content),
				status: "DRAFT",
			})
			.where("id", "=", existing.id)
			.execute();

		// 既存の translation_jobs を一度クリアして入れ直す
		await db
			.deleteFrom("translationJobs")
			.where("pageId", "=", existing.id)
			.execute();

		await insertTranslationJobs(existing.id, params.aiLocales);
		return existing.id;
	}

	const contentId = await insertContentRow();

	const insertedPage = await db
		.insertInto("pages")
		.values({
			id: contentId,
			slug: params.slug,
			sourceLocale: params.sourceLocale,
			// mdast_json は JSONB カラムのためプレーン文字列は入らない
			mdastJson: buildMdastJson(params.content),
			status: "DRAFT",
			userId: params.userId,
			order: 0,
			parentId: null,
		})
		.returning("id")
		.executeTakeFirst();

	if (!insertedPage?.id) {
		throw new Error(`failed to insert page ${params.slug}`);
	}

	await insertTranslationJobs(insertedPage.id, params.aiLocales);
	return insertedPage.id;
}

function buildMdastJson(text: string) {
	return {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [
					{
						type: "text",
						value: text,
					},
				],
			},
		],
	};
}

async function insertContentRow(): Promise<number> {
	const inserted = await db
		.insertInto("contents")
		.values({
			kind: "PAGE",
			importFileId: null,
		})
		.returning("id")
		.executeTakeFirst();

	if (!inserted?.id) throw new Error("failed to insert contents row");
	return inserted.id;
}

async function insertTranslationJobs(pageId: number, locales: string[]) {
	if (!locales.length) return;

	await db
		.insertInto("translationJobs")
		.values(
			locales.map((locale) => ({
				pageId,
				userId: null,
				locale,
				aiModel: "test-model",
				status: "COMPLETED",
				progress: 0,
				error: "",
				updatedAt: new Date(),
			})),
		)
		.execute();
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
		const segmentRow = await db
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
			.returning(["id"])
			.executeTakeFirst();

		if (!segmentRow?.id) {
			throw new Error(`failed to upsert segment ${segment.number}`);
		}

		// 既存翻訳をクリアしてから挿入する
		await db
			.deleteFrom("segmentTranslations")
			.where("segmentId", "=", segmentRow.id)
			.execute();

		const translations: TranslationInput[] = Object.entries(
			segment.translations,
		).map(([locale, text]) => ({
			locale,
			text,
			userId: params.userId,
		}));

		if (translations.length > 0) {
			await db
				.insertInto("segmentTranslations")
				.values(
					translations.map((t) => ({
						segmentId: segmentRow.id,
						locale: t.locale,
						text: t.text,
						userId: t.userId,
						point: 0,
					})),
				)
				.execute();
		}
	}
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await db.destroy();
	});
