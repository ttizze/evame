import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JA_NUMBER_0 = "世界とつながる";
const JA_NUMBER_1 = `Evameは、あなたが書いた記事もコメントも自動で翻訳される多言語コミュニティです。
メニューから好きな言語を選ぶだけで、記事やコメントを思いのままに楽しめます。
海外の読者とも手軽に交流でき、新たな出会いが生まれるかもしれません。
さあ、Evameであなたのアイデアや物語を世界に向けて発信してみましょう。`;

const EN_NUMBER_0: string = "Connect with the world";
const EN_NUMBER_1 = `Evame is a multilingual community where your articles and comments are automatically translated.
Just select your preferred language from the menu, and enjoy articles and comments freely.
You can easily interact with international readers, which might lead to new encounters. 
Come on, let's share your ideas and stories with the world through Evame.`;

// 中国語（簡体字）版
const ZH_NUMBER_0: string = "与世界相连";
const ZH_NUMBER_1 = `Evame是一个多语言社区，您撰写的文章和评论都会被自动翻译。
只需从菜单中选择您喜欢的语言，您就可以随心所欲地享受文章和评论。
您可以轻松地与海外读者交流，这可能会带来新的相遇。
来吧，让我们通过Evame向世界分享您的想法和故事。`;

// 韓国語版
const KO_NUMBER_0: string = "세상과 연결되다";
const KO_NUMBER_1 = `Evame는 당신이 작성한 글과 댓글이 자동으로 번역되는 다국어 커뮤니티입니다.
메뉴에서 원하는 언어를 선택하기만 하면 글과 댓글을 마음껏 즐길 수 있습니다.
해외 독자들과도 쉽게 교류할 수 있어 새로운 만남이 생길지도 모릅니다.
자, Evame에서 당신의 아이디어와 이야기를 세계로 발신해 보세요.`;

// スペイン語版
const ES_NUMBER_0: string = "Conéctate con el mundo";
const ES_NUMBER_1 = `Evame es una comunidad multilingüe donde tus artículos y comentarios se traducen automáticamente.
Solo selecciona el idioma que prefieras del menú y disfruta de los artículos y comentarios libremente.
Puedes interactuar fácilmente con lectores internacionales, lo que podría conducir a nuevos encuentros.
Vamos, compartamos tus ideas e historias con el mundo a través de Evame.`;

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
