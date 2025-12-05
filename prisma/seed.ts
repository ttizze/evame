import { ContentKind, PrismaClient } from "@prisma/client";

import { LOCALE_CONTENT } from "./seed-data/content";

const prisma = new PrismaClient();

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
	await addRequiredData();
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

async function upsertSegment(params: {
	contentId: number;
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	segmentTypeId: number;
	translations: TranslationInput[];
}) {
	await prisma.segment.upsert({
		where: {
			contentId_number: { contentId: params.contentId, number: params.number },
		},
		update: {
			text: params.text,
			number: params.number,
			textAndOccurrenceHash: params.textAndOccurrenceHash,
			segmentTypeId: params.segmentTypeId,
			segmentTranslations: {
				create: params.translations.map((t) => ({
					locale: t.locale,
					text: t.text,
					userId: t.userId,
				})),
			},
		},
		create: {
			contentId: params.contentId,
			text: params.text,
			number: params.number,
			textAndOccurrenceHash: params.textAndOccurrenceHash,
			segmentTypeId: params.segmentTypeId,
			segmentTranslations: {
				create: params.translations.map((t) => ({
					locale: t.locale,
					text: t.text,
					userId: t.userId,
				})),
			},
		},
	});
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

async function addRequiredData() {
	const primarySegmentType = await prisma.segmentType.upsert({
		where: { id: 1 },
		update: {},
		create: { key: "PRIMARY", label: "Primary" },
	});

	const { evame, evameEnPage, evameJaPage } = await createUserAndPages();

	const segmentsByPage: { pageId: number; segments: SegmentData[] }[] = [
		{
			pageId: evameEnPage.id,
			segments: buildSegmentsForLocale("en", EN_TRANSLATIONS),
		},
		{
			pageId: evameJaPage.id,
			segments: buildSegmentsForLocale("ja", JA_TRANSLATIONS),
		},
	];

	const BATCH_SIZE = 20;
	const upsertPromises = segmentsByPage.flatMap(({ pageId, segments }) =>
		segments.map((segment) => async () => {
			const page = await prisma.page.findUnique({
				where: { id: pageId },
				select: { id: true },
			});

			if (!page?.id) {
				throw new Error(`Page ${pageId} does not have a content`);
			}

			await upsertSegment({
				contentId: page.id,
				number: segment.number,
				text: segment.text,
				textAndOccurrenceHash: segment.textAndOccurrenceHash,
				segmentTypeId: primarySegmentType.id,
				translations: Object.entries(segment.translations).map(
					([locale, text]) => ({
						locale,
						text,
						userId: evame.id,
					}),
				),
			});
		}),
	);

	for (let i = 0; i < upsertPromises.length; i += BATCH_SIZE) {
		const batch = upsertPromises.slice(i, i + BATCH_SIZE);
		await Promise.all(batch.map((fn) => fn()));
		console.log(
			`Processed batch ${i / BATCH_SIZE + 1} of ${Math.ceil(upsertPromises.length / BATCH_SIZE)}`,
		);
	}

	console.log("Required data added successfully");

	return { evame, evameEnPage, evameJaPage };
}

async function createUserAndPages() {
	const evame = await prisma.user.upsert({
		where: { handle: "evame" },
		update: {
			provider: "Admin",
			image: "https://evame.tech/favicon.svg",
		},
		create: {
			handle: "evame",
			name: "evame",
			provider: "Admin",
			image: "https://evame.tech/favicon.svg",
			email: "evame@evame.tech",
		},
	});

	const createPage = async (
		slug: string,
		sourceLocale: string,
		content: string,
		aiLocales: string[],
	) => {
		const existingPage = await prisma.page.findUnique({
			where: { slug },
			include: { content: true },
		});

		if (existingPage) {
			return await prisma.page.update({
				where: { id: existingPage.id },
				data: {
					sourceLocale,
					mdastJson: content,
					status: "DRAFT",
					translationJobs: {
						create: aiLocales.map((locale) => ({
							locale,
							status: "COMPLETED",
							aiModel: "test-model",
						})),
					},
				},
			});
		} else {
			const pageContent = await prisma.content.create({
				data: {
					kind: ContentKind.PAGE,
				},
			});

			return await prisma.page.create({
				data: {
					slug,
					sourceLocale,
					mdastJson: content,
					status: "DRAFT",
					userId: evame.id,
					id: pageContent.id,
					translationJobs: {
						create: aiLocales.map((locale) => ({
							locale,
							status: "COMPLETED",
							aiModel: "test-model",
						})),
					},
				},
			});
		}
	};

	const [evameEnPage, evameJaPage] = await Promise.all([
		createPage("evame", "en", LOCALE_CONTENT.en.heroHeader, EN_TRANSLATIONS),
		createPage("evame-ja", "ja", LOCALE_CONTENT.ja.heroHeader, JA_TRANSLATIONS),
	]);

	return { evame, evameEnPage, evameJaPage };
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
