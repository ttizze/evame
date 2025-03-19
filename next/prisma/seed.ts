import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JA_NUMBER_0 = "多言語ブログ";
const JA_NUMBER_1 = `『Evame』は記事もコメントも自動翻訳する多言語ブログプラットフォームです。
言語の壁を超え､あなたの言葉を世界に届け、国際的な交流や知識の共有を手軽に実現します。
もっと多くの人に読んでほしいブロガーやライター、国際的なコミュニティを築きたい企業､メディア、グローバルに知識や情報を共有したい研究者や教育者・専門家に最適です。
Evameで世界への扉を開きましょう。`;

const EN_NUMBER_0: string = "Multilingual Blog";
const EN_NUMBER_1 = `Evame is a multilingual blogging platform that automatically translates articles and comments.
Overcome language barriers, share your words with the world, and easily achieve international interaction and knowledge exchange.
Ideal for bloggers and writers aiming for wider readership, companies and media seeking global communities, and researchers, educators, or experts who wish to share knowledge internationally.
Open the door to the world with Evame.`;

const ZH_NUMBER_0: string = "多语言博客";
const ZH_NUMBER_1 = `Evame是一个文章和评论都能自动翻译的多语言博客平台。
跨越语言障碍，让您的文字传遍全球，轻松实现国际交流和知识共享。
非常适合希望被更多人阅读的博主和作家，想建立国际社区的企业、媒体，以及希望全球分享知识与信息的研究人员、教育者和专业人士。
用Evame开启通往世界的大门吧。`;

const KO_NUMBER_0: string = "다국어 블로그";
const KO_NUMBER_1 = `『Evame』는 글과 댓글이 자동 번역되는 다국어 블로그 플랫폼입니다.
언어의 장벽을 넘어 당신의 메시지를 세계에 전달하고 국제적인 교류와 지식 공유를 간편하게 실현합니다.
더 많은 독자에게 다가가고 싶은 블로거와 작가, 국제 커뮤니티 구축을 원하는 기업과 미디어, 글로벌 지식과 정보 공유를 원하는 연구자, 교육자 및 전문가에게 최적입니다.
Evame에서 세계로 향하는 문을 열어보세요.`;

const ES_NUMBER_0: string = "Blog multilingüe";
const ES_NUMBER_1 = `Evame es una plataforma de blogs multilingüe que traduce automáticamente artículos y comentarios.
Supera las barreras del idioma, lleva tus palabras al mundo y facilita el intercambio internacional y la difusión de conocimiento.
Perfecta para blogueros y escritores que buscan más lectores, empresas y medios que desean construir comunidades globales, y para investigadores, educadores o expertos que quieren compartir conocimientos e información internacionalmente.
Abre la puerta al mundo con Evame.`;

async function seed() {
	await addRequiredData();
}

interface TranslationInput {
	locale: string;
	text: string;
	userId: string;
}

interface UpsertSegmentParams {
	pageId: number;
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	translations: TranslationInput[];
}
async function upsertSegment(params: UpsertSegmentParams) {
	await prisma.pageSegment.upsert({
		where: {
			pageId_number: { pageId: params.pageId, number: params.number },
		},
		update: {
			text: params.text,
			number: params.number,
			pageId: params.pageId,
			textAndOccurrenceHash: params.textAndOccurrenceHash,
			pageSegmentTranslations: {
				create: params.translations.map((t) => ({
					locale: t.locale,
					text: t.text,
					userId: t.userId,
				})),
			},
		},
		create: {
			text: params.text,
			number: params.number,
			pageId: params.pageId,
			textAndOccurrenceHash: params.textAndOccurrenceHash,
			pageSegmentTranslations: {
				create: params.translations.map((t) => ({
					locale: t.locale,
					text: t.text,
					userId: t.userId,
				})),
			},
		},
	});
}
async function addRequiredData() {
	const { evame, evameEnPage, evameJaPage } = await createUserAndPages();

	await Promise.all([
		upsertSegment({
			pageId: evameEnPage.id,
			number: 0,
			text: EN_NUMBER_0,
			textAndOccurrenceHash: "evame-en-segment-0",
			translations: [
				{
					locale: "ja",
					text: JA_NUMBER_0,
					userId: evame.id,
				},
				{
					locale: "zh",
					text: ZH_NUMBER_0,
					userId: evame.id,
				},
				{
					locale: "ko",
					text: KO_NUMBER_0,
					userId: evame.id,
				},
				{
					locale: "es",
					text: ES_NUMBER_0,
					userId: evame.id,
				},
			],
		}),
		upsertSegment({
			pageId: evameEnPage.id,
			number: 1,
			text: EN_NUMBER_1,
			textAndOccurrenceHash: "evame-en-segment-1",
			translations: [
				{
					locale: "ja",
					text: JA_NUMBER_1,
					userId: evame.id,
				},
				{
					locale: "zh",
					text: ZH_NUMBER_1,
					userId: evame.id,
				},
				{
					locale: "ko",
					text: KO_NUMBER_1,
					userId: evame.id,
				},
				{
					locale: "es",
					text: ES_NUMBER_1,
					userId: evame.id,
				},
			],
		}),
		upsertSegment({
			pageId: evameJaPage.id,
			number: 0,
			text: JA_NUMBER_0,
			textAndOccurrenceHash: "evame-ja-segment-0",
			translations: [
				{
					locale: "en",
					text: EN_NUMBER_0,
					userId: evame.id,
				},
				{
					locale: "zh",
					text: ZH_NUMBER_0,
					userId: evame.id,
				},
				{
					locale: "ko",
					text: KO_NUMBER_0,
					userId: evame.id,
				},
				{
					locale: "es",
					text: ES_NUMBER_0,
					userId: evame.id,
				},
			],
		}),
		upsertSegment({
			pageId: evameJaPage.id,
			number: 1,
			text: JA_NUMBER_1,
			textAndOccurrenceHash: "evame-ja-segment-1",
			translations: [
				{
					locale: "en",
					text: EN_NUMBER_1,
					userId: evame.id,
				},
				{
					locale: "zh",
					text: ZH_NUMBER_1,
					userId: evame.id,
				},
				{
					locale: "ko",
					text: KO_NUMBER_1,
					userId: evame.id,
				},
				{
					locale: "es",
					text: ES_NUMBER_1,
					userId: evame.id,
				},
			],
		}),
	]);

	console.log("Required data added successfully");
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

	const evameEnPage = await prisma.page.upsert({
		where: { slug: "evame" },
		update: {
			slug: "evame",
			sourceLocale: "en",
			content: EN_NUMBER_0,
			status: "DRAFT",
			userId: evame.id,
			pageAITranslationInfo: {
				create: [
					{
						locale: "ja",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "zh",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "ko",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "es",
						aiTranslationStatus: "COMPLETED",
					},
				],
			},
		},
		create: {
			slug: "evame",
			sourceLocale: "en",
			content: EN_NUMBER_0,
			status: "DRAFT",
			userId: evame.id,
			pageAITranslationInfo: {
				create: [
					{
						locale: "ja",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "zh",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "ko",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "es",
						aiTranslationStatus: "COMPLETED",
					},
				],
			},
		},
	});

	// 日本語ページを upsert
	const evameJaPage = await prisma.page.upsert({
		where: { slug: "evame-ja" },
		update: {
			slug: "evame-ja",
			sourceLocale: "ja",
			content: JA_NUMBER_0,
			status: "DRAFT",
			userId: evame.id,
			pageAITranslationInfo: {
				create: [
					{
						locale: "en",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "zh",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "ko",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "es",
						aiTranslationStatus: "COMPLETED",
					},
				],
			},
		},
		create: {
			slug: "evame-ja",
			sourceLocale: "ja",
			content: JA_NUMBER_0,
			status: "DRAFT",
			userId: evame.id,
			pageAITranslationInfo: {
				create: [
					{
						locale: "en",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "zh",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "ko",
						aiTranslationStatus: "COMPLETED",
					},
					{
						locale: "es",
						aiTranslationStatus: "COMPLETED",
					},
				],
			},
		},
	});

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
