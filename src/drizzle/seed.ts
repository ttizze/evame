import "dotenv/config";

import { eq } from "drizzle-orm";
import { makeDb } from "./index";
import * as schema from "./schema";
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

const db = makeDb();

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
		.select({ id: schema.segmentTypes.id })
		.from(schema.segmentTypes)
		.where(eq(schema.segmentTypes.key, "PRIMARY"))
		.limit(1);

	if (existing.length > 0) return existing[0].id;

	const inserted = await db
		.insert(schema.segmentTypes)
		.values({ key: "PRIMARY" as const, label: "Primary" })
		.returning({ id: schema.segmentTypes.id });

	if (!inserted[0]?.id) {
		throw new Error("failed to insert segment_types.PRIMARY");
	}
	return inserted[0].id;
}

async function ensureEvameUser(): Promise<string> {
	const existing = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(eq(schema.users.handle, "evame"))
		.limit(1);

	if (existing.length > 0) {
		// 必要項目だけ更新
		await db
			.update(schema.users)
			.set({
				provider: "Admin",
				image: "https://evame.tech/favicon.svg",
			})
			.where(eq(schema.users.id, existing[0].id));
		return existing[0].id;
	}

	const inserted = await db
		.insert(schema.users)
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
			isAI: false,
		})
		.returning({ id: schema.users.id });

	if (!inserted[0]?.id) throw new Error("failed to insert user evame");
	return inserted[0].id;
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
		.select({ id: schema.pages.id })
		.from(schema.pages)
		.where(eq(schema.pages.slug, params.slug))
		.limit(1);

	if (existing.length > 0) {
		await db
			.update(schema.pages)
			.set({
				sourceLocale: params.sourceLocale,
				// mdast_json は JSONB カラムのためプレーン文字列は入らない
				mdastJson: buildMdastJson(params.content),
				status: "DRAFT" as const,
			})
			.where(eq(schema.pages.id, existing[0].id));

		// 既存の translation_jobs を一度クリアして入れ直す
		await db
			.delete(schema.translationJobs)
			.where(eq(schema.translationJobs.pageId, existing[0].id));

		await insertTranslationJobs(existing[0].id, params.aiLocales);
		return existing[0].id;
	}

	const contentId = await insertContentRow();

	const insertedPage = await db
		.insert(schema.pages)
		.values({
			id: contentId,
			slug: params.slug,
			sourceLocale: params.sourceLocale,
			// mdast_json は JSONB カラムのためプレーン文字列は入らない
			mdastJson: buildMdastJson(params.content),
			status: "DRAFT" as const,
			userId: params.userId,
			order: 0,
			parentId: null,
		})
		.returning({ id: schema.pages.id });

	if (!insertedPage[0]?.id) {
		throw new Error(`failed to insert page ${params.slug}`);
	}

	await insertTranslationJobs(insertedPage[0].id, params.aiLocales);
	return insertedPage[0].id;
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
		.insert(schema.contents)
		.values({
			kind: "PAGE",
			importFileId: null,
		})
		.returning({ id: schema.contents.id });

	if (!inserted[0]?.id) throw new Error("failed to insert contents row");
	return inserted[0].id;
}

async function insertTranslationJobs(pageId: number, locales: string[]) {
	if (!locales.length) return;

	await db.insert(schema.translationJobs).values(
		locales.map((locale) => ({
			pageId,
			userId: null,
			locale,
			aiModel: "test-model",
			status: "COMPLETED" as const,
			progress: 0,
			error: "",
		})),
	);
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
			.insert(schema.segments)
			.values({
				contentId: params.pageId,
				number: segment.number,
				text: segment.text,
				textAndOccurrenceHash: segment.textAndOccurrenceHash,
				segmentTypeId: params.segmentTypeId,
			})
			.onConflictDoUpdate({
				target: [schema.segments.contentId, schema.segments.number],
				set: {
					text: segment.text,
					textAndOccurrenceHash: segment.textAndOccurrenceHash,
					segmentTypeId: params.segmentTypeId,
				},
			})
			.returning({ id: schema.segments.id });

		if (!segmentRow[0]?.id) {
			throw new Error(`failed to upsert segment ${segment.number}`);
		}

		// 既存翻訳をクリアしてから挿入する
		await db
			.delete(schema.segmentTranslations)
			.where(eq(schema.segmentTranslations.segmentId, segmentRow[0].id));

		const translations: TranslationInput[] = Object.entries(
			segment.translations,
		).map(([locale, text]) => ({
			locale,
			text,
			userId: params.userId,
		}));

		if (translations.length > 0) {
			await db.insert(schema.segmentTranslations).values(
				translations.map((t) => ({
					segmentId: segmentRow[0].id,
					locale: t.locale,
					text: t.text,
					userId: t.userId,
					point: 0,
				})),
			);
		}
	}
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		// ローカル環境の場合のみPoolを閉じる
		const dbWithPool = db as typeof db & {
			pool?: { end: () => Promise<void> };
		};
		if (dbWithPool.pool) {
			await dbWithPool.pool.end();
		}
	});
