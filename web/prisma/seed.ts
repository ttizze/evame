import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const JA_NUMBER_0 = "世界とつながる";
const JA_NUMBER_1 = `Evameは、あなたが書いた記事を多言語に翻訳し、世界中の読者へ届けるコミュニティです。
メニューから好きな言語を選ぶだけで、記事やコメントを思いのままに楽しめます。
海外の読者とも手軽に交流でき、新たな出会いが生まれるかもしれません。
さあ、Evameであなたのアイデアや物語を世界に向けて発信してみましょう。`;

const EN_NUMBER_0: string = "Connect with the world";
const EN_NUMBER_1 = `Evame is a community that translates the articles you write into multiple languages and delivers them to readers around the world.
By simply selecting your preferred language from the menu, you can enjoy articles and comments however you like.
You can also easily interact with readers overseas, potentially creating new connections.
Now, let's share your ideas and stories with the world through Evame!`;

// 中国語（簡体字）版
const ZH_NUMBER_0: string = "与世界相连";
const ZH_NUMBER_1 = `Evame 是一个将您所写的文章翻译成多种语言并传播给全世界读者的社区。
只需从菜单中选择您喜欢的语言，就能随心所欲地阅读文章和评论。
您也可以轻松地与海外读者互动，或许会结识新的朋友。
现在，就让我们通过 Evame 向全世界分享您的想法和故事吧！`;

// 韓国語版
const KO_NUMBER_0: string = "세상과 연결되다";
const KO_NUMBER_1 = `Evame는 당신이 작성한 기사를 여러 언어로 번역하여 전 세계 독자들에게 전달하는 커뮤니ティ입니다.
메뉴에서 원하는 언어를 선택하기만 하면 기사와 댓글을 원하는 대로 즐길 수 있습니다.
해외 독자들과도 쉽게 교류할 수 있어 새로운 만남이 생길지도 모릅니다.
이제 Evame를 통해 당신의 아이디어와 이야기를 전 세계에 전해보세요!`;

// スペイン語版
const ES_NUMBER_0: string = "Conéctate con el mundo";
const ES_NUMBER_1 = `Evame es una comunidad que traduce los artículos que escribes a varios idiomas y los lleva a lectores de todo el mundo.
Con solo elegir tu idioma preferido en el menú, puedes disfrutar de artículos y comentarios de la manera que más te guste.
También puedes interactuar fácilmente con lectores de otros países, lo que podría dar lugar a nuevos encuentros.
¡Ahora, comparte tus ideas e historias con el mundo a través de Evame!`;

async function seed() {
	await addRequiredData();

	if (process.env.NODE_ENV === "development") {
		await addDevelopmentData();
	}
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
		update: {},
		create: {
			slug: "evame",
			sourceLocale: "en",
			content: EN_NUMBER_0,
			status: "DRAFT",
			userId: evame.id,
		},
	});

	// 日本語ページを upsert
	const evameJaPage = await prisma.page.upsert({
		where: { slug: "evame-ja" },
		update: {},
		create: {
			slug: "evame-ja",
			sourceLocale: "ja",
			content: JA_NUMBER_0,
			status: "DRAFT",
			userId: evame.id,
		},
	});

	return { evame, evameEnPage, evameJaPage };
}

export async function addDevelopmentData() {
	const email = "dev@example.com";

	const devEmail = await prisma.user.upsert({
		where: { email },
		update: {
			email,
		},
		create: {
			email,
			handle: "dev",
			name: "Dev User",
			image: "",
			credential: {
				create: {
					password: await bcrypt.hash("devpassword", 10),
				},
			},
		},
	});

	console.log(
		`Created/Updated dev user with ID=${devEmail.id}, email=${devEmail.email}`,
	);
}
seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
