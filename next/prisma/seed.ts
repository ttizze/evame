import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JA_HERO_HEADER = "開発者のためのグローバルコミュニティ";
const JA_HERO_TEXT = `『Evame』は、開発者がプロジェクトを世界に広め、グローバルなユーザーを獲得できる多言語コミュニティです。
技術的な解説やストーリーを記事として発信したり、取り組んでいる製品やプロジェクトを共有し、世界中の開発者やユーザーと交流できます。
言語の壁を気にせず、グローバルな認知度アップと技術交流を同時に実現しましょう。`;

const JA_OUR_PROBLEM_HEADER = "言語の壁が、あなたの可能性を閉じ込めている";

const JA_OUR_PROBLEM_1_HEADER = "自動多言語翻訳";
const JA_OUR_PROBLEM_1_TEXT = `どれだけ優れたプロジェクトでも、一つの言語で発信するだけでは、世界中の潜在ユーザーの90%以上に届いていません。
Evameでは、プロジェクトや記事を投稿すると、AIによって自動で多言語に翻訳され、世界中に自然に広がります。`;

const JA_OUR_PROBLEM_2_HEADER = "翻訳コメントによる国際交流";
const JA_OUR_PROBLEM_2_TEXT = `他の言語圏との交流は閉ざされていて、言語をまたいだ議論やフィードバックは実質的に不可能です。
Evameでは、コメントも自動的に翻訳され、誰もが世界の開発者と自然に会話できます。`;

const JA_OUR_PROBLEM_3_HEADER = "ユーザーと紡ぐ物語";
const JA_OUR_PROBLEM_3_TEXT = `どれだけ優れた製品や技術であっても、その背景にある想いやストーリーが伝わらなければ、人々の心は動きません。
Evameでは、あなたの製品開発の過程や技術的な挑戦を記事やコメントとして発信することで、世界中のユーザーとつながり、物語を共有しながら、共感とともにファンや仲間が自然と集まってきます。`;
const EN_HERO_HEADER = "Global Community for Developers";
const EN_HERO_TEXT = `"Evame" is a multilingual platform where developers can publish projects, articles, and comments, which are automatically translated into multiple languages and shared globally.
Break down language barriers to gain visibility, connect with developers and users around the world, and grow together through global collaboration.`;

const EN_OUR_PROBLEM_HEADER =
	"Language barriers are locking away your potential.";

const EN_OUR_PROBLEM_1_HEADER = "Automatic Multilingual Publishing";
const EN_OUR_PROBLEM_1_TEXT = `No matter how great your project is, publishing in only one language means missing out on over 90% of potential global users.
Evame automatically translates your content and spreads it worldwide, helping you reach a global audience effortlessly.`;

const EN_OUR_PROBLEM_2_HEADER =
	"International Dialogue through Translated Comments";
const EN_OUR_PROBLEM_2_TEXT = `Interaction across language boundaries is virtually impossible without translation.
With Evame, comments are automatically translated, enabling natural conversations with developers around the world.`;

const EN_OUR_PROBLEM_3_HEADER = "Stories that Connect with Users";
const EN_OUR_PROBLEM_3_TEXT = `Even the best products and technologies struggle to inspire if their stories aren't told.
By sharing the journey of your development through articles and comments, you build emotional connections and naturally attract passionate users and fans.`;
const ZH_HERO_HEADER = "面向开发者的全球社区";
const ZH_HERO_TEXT = `Evame 是一个多语言平台，开发者可以发布项目、文章和评论，系统会自动将内容翻译成多种语言并推向全球。
打破语言壁垒，让你的作品获得全球曝光，与世界各地的用户和开发者互动，共同成长。`;

const ZH_OUR_PROBLEM_HEADER = "语言的障碍正在封锁你的潜力。";

const ZH_OUR_PROBLEM_1_HEADER = "自动多语言发布";
const ZH_OUR_PROBLEM_1_TEXT = `即使项目再优秀，仅使用一种语言发布也无法触达全球90%以上的潜在用户。
Evame 自动翻译并推广你的内容，助你轻松触达全球观众。`;

const ZH_OUR_PROBLEM_2_HEADER = "通过翻译评论实现国际交流";
const ZH_OUR_PROBLEM_2_TEXT = `不同语言之间的互动几乎是不可能的。
在 Evame，评论将被自动翻译，让你可以自然地与全球开发者交流对话。`;

const ZH_OUR_PROBLEM_3_HEADER = "与用户共同讲述你的故事";
const ZH_OUR_PROBLEM_3_TEXT = `再好的产品与技术，如果背后的故事无法传达，也难以打动人心。
通过发布你的开发过程、挑战和思考，建立情感连接，吸引热情的粉丝与用户。`;
const KO_HERO_HEADER = "개발자를 위한 글로벌 커뮤니티";
const KO_HERO_TEXT = `Evame는 개발자가 프로젝트, 글, 댓글을 게시하면 AI가 자동으로 여러 언어로 번역하여 전 세계에 퍼뜨리는 다국어 플랫폼입니다.
언어 장벽을 허물고 전 세계 사용자 및 개발자와 연결되어 함께 성장하세요.`;

const KO_OUR_PROBLEM_HEADER = "언어 장벽이 당신의 가능성을 가두고 있습니다.";

const KO_OUR_PROBLEM_1_HEADER = "자동 다국어 게시";
const KO_OUR_PROBLEM_1_TEXT = `아무리 훌륭한 프로젝트라도 하나의 언어만으로는 전 세계 잠재 사용자의 90% 이상에게 도달하지 못합니다.
Evame는 콘텐츠를 자동 번역하여 전 세계에 자연스럽게 확산시켜 줍니다.`;

const KO_OUR_PROBLEM_2_HEADER = "번역 댓글을 통한 국제 교류";
const KO_OUR_PROBLEM_2_TEXT = `언어가 다르면 개발자 간 대화와 피드백이 사실상 불가능합니다.
Evame에서는 댓글이 자동 번역되어 누구나 자연스럽게 세계의 개발자와 대화할 수 있습니다.`;

const KO_OUR_PROBLEM_3_HEADER = "사용자와 함께 쓰는 이야기";
const KO_OUR_PROBLEM_3_TEXT = `아무리 뛰어난 기술이나 제품이라도 그 배경과 이야기가 전달되지 않으면 사람들의 마음을 움직일 수 없습니다.
개발 과정을 글과 댓글로 공유함으로써 전 세계 사용자와 연결되고, 열정을 공유하며 팬과 사용자를 자연스럽게 모을 수 있습니다.`;
const ES_HERO_HEADER = "Comunidad global para desarrolladores";
const ES_HERO_TEXT = `Evame es una plataforma multilingüe donde los desarrolladores pueden publicar proyectos, artículos y comentarios que se traducen automáticamente a varios idiomas y se comparten globalmente.
Rompe las barreras del idioma, conéctate con desarrolladores de todo el mundo y haz crecer tu comunidad con colaboración internacional.`;

const ES_OUR_PROBLEM_HEADER =
	"Las barreras del idioma están encerrando tu potencial.";

const ES_OUR_PROBLEM_1_HEADER = "Publicación multilingüe automática";
const ES_OUR_PROBLEM_1_TEXT = `No importa cuán excelente sea tu proyecto, si publicas solo en un idioma, no alcanzarás a más del 90% de los usuarios potenciales.
Evame traduce tu contenido automáticamente y lo distribuye por todo el mundo.`;

const ES_OUR_PROBLEM_2_HEADER =
	"Comentarios traducidos para el diálogo internacional";
const ES_OUR_PROBLEM_2_TEXT = `Sin traducción, la interacción entre idiomas es casi imposible.
Evame traduce automáticamente los comentarios, permitiendo conversaciones naturales con desarrolladores de todo el mundo.`;

const ES_OUR_PROBLEM_3_HEADER = "Historias que conectan con los usuarios";
const ES_OUR_PROBLEM_3_TEXT = `Incluso el mejor producto o tecnología no genera impacto si su historia no se cuenta.
Evame te permite compartir tus desafíos y el proceso de desarrollo, creando conexiones emocionales que atraen fans y usuarios con entusiasmo.`;

const JA_FEATURE_HEADER = "主な機能";

const JA_FEATURE_1_HEADER = "自動翻訳";
const JA_FEATURE_1_TEXT =
	"記事やコメント、プロジェクトの説明が自動的に複数の言語に翻訳され、言語の壁を取り払います。";

const JA_FEATURE_2_HEADER = "使いやすいエディタ";
const JA_FEATURE_2_TEXT =
	"Markdownをサポートする､PCでもモバイルでも使いやすいエディタ。自然に書くだけで、AIが翻訳をシームレスに処理します。プロジェクトの登録や更新情報の共有も簡単に行えます。";

const JA_FEATURE_3_HEADER = "継続的な改善";
const JA_FEATURE_3_TEXT =
	"ユーザーの投票やコミュニティによる新しい翻訳の追加により、翻訳は継続的に改善されます。試しにこの訳文をクリックしてみてください｡投票や追加のフォームが現れるはずです｡あなたのプロジェクトに対するフィードバックも世界中から得られ、継続的に改善できます。";
const EN_FEATURE_HEADER = "Key Features";

const EN_FEATURE_1_HEADER = "Automatic Translation";
const EN_FEATURE_1_TEXT =
	"Articles, comments, and project descriptions are automatically translated into multiple languages, breaking down language barriers.";

const EN_FEATURE_2_HEADER = "Easy-to-use Editor";
const EN_FEATURE_2_TEXT =
	"A user-friendly editor for both PC and mobile, supporting Markdown. Just write naturally, easily manage your projects and updates, and let the AI handle translations seamlessly.";

const EN_FEATURE_3_HEADER = "Continuous Improvement";
const EN_FEATURE_3_TEXT =
	"Translations continuously improve through user voting and community-contributed translations. Click on this translation to see the voting and submission form. Gather global feedback for your projects to ensure continuous improvement.";

// Chinese
const ZH_FEATURE_HEADER = "主要功能";

const ZH_FEATURE_1_HEADER = "自动翻译";
const ZH_FEATURE_1_TEXT =
	"文章、评论和项目介绍自动翻译成多种语言，打破语言障碍。";

const ZH_FEATURE_2_HEADER = "易用的编辑器";
const ZH_FEATURE_2_TEXT =
	"支持Markdown的PC和移动端友好编辑器。只需自然书写，轻松管理项目和更新，AI会无缝地进行翻译。";

const ZH_FEATURE_3_HEADER = "持续改进";
const ZH_FEATURE_3_TEXT =
	"通过用户投票和社区贡献新翻译，不断提高翻译质量。点击此翻译即可看到投票和提交表单。您也能从全球获得对项目的反馈，确保持续改进。";

// Korean
const KO_FEATURE_HEADER = "주요 기능";

const KO_FEATURE_1_HEADER = "자동 번역";
const KO_FEATURE_1_TEXT =
	"글, 댓글 및 프로젝트 소개가 여러 언어로 자동 번역되어 언어 장벽을 허물어 줍니다.";

const KO_FEATURE_2_HEADER = "사용하기 쉬운 에디터";
const KO_FEATURE_2_TEXT =
	"마크다운을 지원하는 PC 및 모바일 친화적인 에디터입니다. 자연스럽게 작성하고 프로젝트 관리 및 업데이트를 쉽게 하며, AI가 번역을 원활히 처리합니다.";

const KO_FEATURE_3_HEADER = "지속적인 개선";
const KO_FEATURE_3_TEXT =
	"사용자 투표와 커뮤니티의 번역 추가를 통해 번역 품질이 지속적으로 개선됩니다. 이 번역을 클릭하면 투표 및 제출 양식이 나타납니다. 글로벌 피드백을 통해 프로젝트도 지속적으로 개선하세요.";

// Spanish
const ES_FEATURE_HEADER = "Características principales";

const ES_FEATURE_1_HEADER = "Traducción automática";
const ES_FEATURE_1_TEXT =
	"Los artículos, comentarios y descripciones de proyectos se traducen automáticamente a varios idiomas, eliminando las barreras lingüísticas.";

const ES_FEATURE_2_HEADER = "Editor fácil de usar";
const ES_FEATURE_2_TEXT =
	"Editor intuitivo compatible con Markdown, tanto en PC como en dispositivos móviles. Escribe de manera natural, gestiona fácilmente tus proyectos y actualizaciones, y deja que la IA maneje las traducciones automáticamente.";

const ES_FEATURE_3_HEADER = "Mejora continua";
const ES_FEATURE_3_TEXT =
	"Las traducciones mejoran continuamente gracias a los votos de usuarios y las contribuciones de la comunidad. Haz clic en esta traducción para acceder al formulario de votación y envío. Además, recibe feedback global sobre tus proyectos para mejorarlos continuamente.";

async function seed() {
	const { evame, evameEnPage, evameJaPage } = await addRequiredData();

	// Create sample comments for the About page
	await createPageComments(evame.id, evameEnPage.id);
	await createPageComments(evame.id, evameJaPage.id);

	console.log("Seed completed successfully");
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

	type SegmentData = {
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		translations: Record<string, string>;
	};

	const segmentsByPage: { pageId: number; segments: SegmentData[] }[] = [
		{
			pageId: evameEnPage.id,
			segments: [
				{
					number: 0,
					text: EN_HERO_HEADER,
					textAndOccurrenceHash: "evame-en-segment-0",
					translations: {
						ja: JA_HERO_HEADER,
						zh: ZH_HERO_HEADER,
						ko: KO_HERO_HEADER,
						es: ES_HERO_HEADER,
					},
				},
				{
					number: 1,
					text: EN_HERO_TEXT,
					textAndOccurrenceHash: "evame-en-segment-1",
					translations: {
						ja: JA_HERO_TEXT,
						zh: ZH_HERO_TEXT,
						ko: KO_HERO_TEXT,
						es: ES_HERO_TEXT,
					},
				},
				{
					number: 2,
					text: EN_OUR_PROBLEM_HEADER,
					textAndOccurrenceHash: "evame-en-segment-2",
					translations: {
						ja: JA_OUR_PROBLEM_HEADER,
						zh: ZH_OUR_PROBLEM_HEADER,
						ko: KO_OUR_PROBLEM_HEADER,
						es: ES_OUR_PROBLEM_HEADER,
					},
				},
				{
					number: 3,
					text: EN_OUR_PROBLEM_1_HEADER,
					textAndOccurrenceHash: "evame-en-segment-3",
					translations: {
						ja: JA_OUR_PROBLEM_1_HEADER,
						zh: ZH_OUR_PROBLEM_1_HEADER,
						ko: KO_OUR_PROBLEM_1_HEADER,
						es: ES_OUR_PROBLEM_1_HEADER,
					},
				},
				{
					number: 4,
					text: EN_OUR_PROBLEM_1_TEXT,
					textAndOccurrenceHash: "evame-en-segment-4",
					translations: {
						ja: JA_OUR_PROBLEM_1_TEXT,
						zh: ZH_OUR_PROBLEM_1_TEXT,
						ko: KO_OUR_PROBLEM_1_TEXT,
						es: ES_OUR_PROBLEM_1_TEXT,
					},
				},
				{
					number: 5,
					text: EN_OUR_PROBLEM_2_HEADER,
					textAndOccurrenceHash: "evame-en-segment-5",
					translations: {
						ja: JA_OUR_PROBLEM_2_HEADER,
						zh: ZH_OUR_PROBLEM_2_HEADER,
						ko: KO_OUR_PROBLEM_2_HEADER,
						es: ES_OUR_PROBLEM_2_HEADER,
					},
				},
				{
					number: 6,
					text: EN_OUR_PROBLEM_2_TEXT,
					textAndOccurrenceHash: "evame-en-segment-6",
					translations: {
						ja: JA_OUR_PROBLEM_2_TEXT,
						zh: ZH_OUR_PROBLEM_2_TEXT,
						ko: KO_OUR_PROBLEM_2_TEXT,
						es: ES_OUR_PROBLEM_2_TEXT,
					},
				},
				{
					number: 7,
					text: EN_OUR_PROBLEM_3_HEADER,
					textAndOccurrenceHash: "evame-en-segment-7",
					translations: {
						ja: JA_OUR_PROBLEM_3_HEADER,
						zh: ZH_OUR_PROBLEM_3_HEADER,
						ko: KO_OUR_PROBLEM_3_HEADER,
						es: ES_OUR_PROBLEM_3_HEADER,
					},
				},
				{
					number: 8,
					text: EN_OUR_PROBLEM_3_TEXT,
					textAndOccurrenceHash: "evame-en-segment-8",
					translations: {
						ja: JA_OUR_PROBLEM_3_TEXT,
						zh: ZH_OUR_PROBLEM_3_TEXT,
						ko: KO_OUR_PROBLEM_3_TEXT,
						es: ES_OUR_PROBLEM_3_TEXT,
					},
				},
				{
					number: 9,
					text: EN_FEATURE_HEADER,
					textAndOccurrenceHash: "evame-en-segment-9",
					translations: {
						ja: JA_FEATURE_HEADER,
						zh: ZH_FEATURE_HEADER,
						ko: KO_FEATURE_HEADER,
						es: ES_FEATURE_HEADER,
					},
				},
				{
					number: 10,
					text: EN_FEATURE_1_HEADER,
					textAndOccurrenceHash: "evame-en-segment-10",
					translations: {
						ja: JA_FEATURE_1_HEADER,
						zh: ZH_FEATURE_1_HEADER,
						ko: KO_FEATURE_1_HEADER,
						es: ES_FEATURE_1_HEADER,
					},
				},
				{
					number: 11,
					text: EN_FEATURE_1_TEXT,
					textAndOccurrenceHash: "evame-en-segment-11",
					translations: {
						ja: JA_FEATURE_1_TEXT,
						zh: ZH_FEATURE_1_TEXT,
						ko: KO_FEATURE_1_TEXT,
						es: ES_FEATURE_1_TEXT,
					},
				},
				{
					number: 12,
					text: EN_FEATURE_2_HEADER,
					textAndOccurrenceHash: "evame-en-segment-12",
					translations: {
						ja: JA_FEATURE_2_HEADER,
						zh: ZH_FEATURE_2_HEADER,
						ko: KO_FEATURE_2_HEADER,
						es: ES_FEATURE_2_HEADER,
					},
				},
				{
					number: 13,
					text: EN_FEATURE_2_TEXT,
					textAndOccurrenceHash: "evame-en-segment-13",
					translations: {
						ja: JA_FEATURE_2_TEXT,
						zh: ZH_FEATURE_2_TEXT,
						ko: KO_FEATURE_2_TEXT,
						es: ES_FEATURE_2_TEXT,
					},
				},
				{
					number: 14,
					text: EN_FEATURE_3_HEADER,
					textAndOccurrenceHash: "evame-en-segment-14",
					translations: {
						ja: JA_FEATURE_3_HEADER,
						zh: ZH_FEATURE_3_HEADER,
						ko: KO_FEATURE_3_HEADER,
						es: ES_FEATURE_3_HEADER,
					},
				},
				{
					number: 15,
					text: EN_FEATURE_3_TEXT,
					textAndOccurrenceHash: "evame-en-segment-15",
					translations: {
						ja: JA_FEATURE_3_TEXT,
						zh: ZH_FEATURE_3_TEXT,
						ko: KO_FEATURE_3_TEXT,
						es: ES_FEATURE_3_TEXT,
					},
				},
			],
		},
		{
			pageId: evameJaPage.id,
			segments: [
				{
					number: 0,
					text: JA_HERO_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-0",
					translations: {
						en: EN_HERO_HEADER,
						zh: ZH_HERO_HEADER,
						ko: KO_HERO_HEADER,
						es: ES_HERO_HEADER,
					},
				},
				{
					number: 1,
					text: JA_HERO_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-1",
					translations: {
						en: EN_HERO_TEXT,
						zh: ZH_HERO_TEXT,
						ko: KO_HERO_TEXT,
						es: ES_HERO_TEXT,
					},
				},
				{
					number: 2,
					text: JA_OUR_PROBLEM_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-2",
					translations: {
						en: EN_OUR_PROBLEM_HEADER,
						zh: ZH_OUR_PROBLEM_HEADER,
						ko: KO_OUR_PROBLEM_HEADER,
						es: ES_OUR_PROBLEM_HEADER,
					},
				},
				{
					number: 3,
					text: JA_OUR_PROBLEM_1_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-3",
					translations: {
						en: EN_OUR_PROBLEM_1_HEADER,
						zh: ZH_OUR_PROBLEM_1_HEADER,
						ko: KO_OUR_PROBLEM_1_HEADER,
						es: ES_OUR_PROBLEM_1_HEADER,
					},
				},
				{
					number: 4,
					text: JA_OUR_PROBLEM_1_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-4",
					translations: {
						en: EN_OUR_PROBLEM_1_TEXT,
						zh: ZH_OUR_PROBLEM_1_TEXT,
						ko: KO_OUR_PROBLEM_1_TEXT,
						es: ES_OUR_PROBLEM_1_TEXT,
					},
				},
				{
					number: 5,
					text: JA_OUR_PROBLEM_2_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-5",
					translations: {
						en: EN_OUR_PROBLEM_2_HEADER,
						zh: ZH_OUR_PROBLEM_2_HEADER,
						ko: KO_OUR_PROBLEM_2_HEADER,
						es: ES_OUR_PROBLEM_2_HEADER,
					},
				},
				{
					number: 6,
					text: JA_OUR_PROBLEM_2_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-6",
					translations: {
						en: EN_OUR_PROBLEM_2_TEXT,
						zh: ZH_OUR_PROBLEM_2_TEXT,
						ko: KO_OUR_PROBLEM_2_TEXT,
						es: ES_OUR_PROBLEM_2_TEXT,
					},
				},
				{
					number: 7,
					text: JA_OUR_PROBLEM_3_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-7",
					translations: {
						en: EN_OUR_PROBLEM_3_HEADER,
						zh: ZH_OUR_PROBLEM_3_HEADER,
						ko: KO_OUR_PROBLEM_3_HEADER,
						es: ES_OUR_PROBLEM_3_HEADER,
					},
				},
				{
					number: 8,
					text: JA_OUR_PROBLEM_3_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-8",
					translations: {
						en: EN_OUR_PROBLEM_3_TEXT,
						zh: ZH_OUR_PROBLEM_3_TEXT,
						ko: KO_OUR_PROBLEM_3_TEXT,
						es: ES_OUR_PROBLEM_3_TEXT,
					},
				},
				{
					number: 9,
					text: JA_FEATURE_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-9",
					translations: {
						en: EN_FEATURE_HEADER,
						zh: ZH_FEATURE_HEADER,
						ko: KO_FEATURE_HEADER,
						es: ES_FEATURE_HEADER,
					},
				},
				{
					number: 10,
					text: JA_FEATURE_1_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-10",
					translations: {
						en: EN_FEATURE_1_HEADER,
						zh: ZH_FEATURE_1_HEADER,
						ko: KO_FEATURE_1_HEADER,
						es: ES_FEATURE_1_HEADER,
					},
				},
				{
					number: 11,
					text: JA_FEATURE_1_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-11",
					translations: {
						en: EN_FEATURE_1_TEXT,
						zh: ZH_FEATURE_1_TEXT,
						ko: KO_FEATURE_1_TEXT,
						es: ES_FEATURE_1_TEXT,
					},
				},
				{
					number: 12,
					text: JA_FEATURE_2_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-12",
					translations: {
						en: EN_FEATURE_2_HEADER,
						zh: ZH_FEATURE_2_HEADER,
						ko: KO_FEATURE_2_HEADER,
						es: ES_FEATURE_2_HEADER,
					},
				},
				{
					number: 13,
					text: JA_FEATURE_2_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-13",
					translations: {
						en: EN_FEATURE_2_TEXT,
						zh: ZH_FEATURE_2_TEXT,
						ko: KO_FEATURE_2_TEXT,
						es: ES_FEATURE_2_TEXT,
					},
				},
				{
					number: 14,
					text: JA_FEATURE_3_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-14",
					translations: {
						en: EN_FEATURE_3_HEADER,
						zh: ZH_FEATURE_3_HEADER,
						ko: KO_FEATURE_3_HEADER,
						es: ES_FEATURE_3_HEADER,
					},
				},
				{
					number: 15,
					text: JA_FEATURE_3_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-15",
					translations: {
						en: EN_FEATURE_3_TEXT,
						zh: ZH_FEATURE_3_TEXT,
						ko: KO_FEATURE_3_TEXT,
						es: ES_FEATURE_3_TEXT,
					},
				},
			],
		},
	];

	const BATCH_SIZE = 3; // Adjust based on your connection pool limit
	const upsertPromises = segmentsByPage.flatMap(({ pageId, segments }) =>
		segments.map(
			(segment) => () =>
				upsertSegment({
					pageId,
					number: segment.number,
					text: segment.text,
					textAndOccurrenceHash: segment.textAndOccurrenceHash,
					translations: Object.entries(segment.translations).map(
						([locale, text]) => ({
							locale,
							text,
							userId: evame.id,
						}),
					),
				}),
		),
	);

	// Process in batches
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
	) =>
		prisma.page.upsert({
			where: { slug },
			update: {
				slug,
				sourceLocale,
				content,
				status: "DRAFT",
				userId: evame.id,
				pageAITranslationInfo: {
					create: aiLocales.map((locale) => ({
						locale,
						aiTranslationStatus: "COMPLETED",
					})),
				},
			},
			create: {
				slug,
				sourceLocale,
				content,
				status: "DRAFT",
				userId: evame.id,
				pageAITranslationInfo: {
					create: aiLocales.map((locale) => ({
						locale,
						aiTranslationStatus: "COMPLETED",
					})),
				},
			},
		});

	const [evameEnPage, evameJaPage] = await Promise.all([
		createPage("evame", "en", EN_HERO_HEADER, ["ja", "zh", "ko", "es"]),
		createPage("evame-ja", "ja", JA_HERO_HEADER, ["en", "zh", "ko", "es"]),
	]);

	return { evame, evameEnPage, evameJaPage };
}

async function createPageComments(userId: string, pageId: number) {
	console.log("Creating sample comments for About page...");

	// Create 3 sample comments
	const commentContents = [
		"This is a great platform! I've been looking for something that helps developers showcase their work globally.",
		"I love how Evame handles translations automatically. As a developer who speaks multiple languages, this is exactly what I needed.",
		"The automatic translation of comments is a game-changer. Now I can communicate with developers from all over the world!",
	];

	const commentLocales = ["en", "ja", "en"];

	// Add sample comments
	for (let i = 0; i < commentContents.length; i++) {
		const comment = await prisma.pageComment.create({
			data: {
				content: commentContents[i],
				locale: commentLocales[i],
				userId: userId,
				pageId: pageId,
				// Create comment segments
				pageCommentSegments: {
					create: {
						text: commentContents[i],
						number: 0,
						textAndOccurrenceHash: `sample-comment-${i}-hash`,
						// Add segment translations
						pageCommentSegmentTranslations: {
							create: [
								{
									locale: "en",
									text: commentContents[i],
									userId: userId,
								},
								{
									locale: "ja",
									text:
										i === 0
											? "素晴らしいプラットフォームですね！開発者が自分の作品をグローバルに紹介できるものを探していました。"
											: i === 1
												? "Evameが自動的に翻訳を処理する方法が気に入っています。複数の言語を話す開発者として、これはまさに私が必要としていたものです。"
												: "コメントの自動翻訳は革命的です。今なら世界中の開発者とコミュニケーションできます！",
									userId: userId,
								},
								{
									locale: "zh",
									text:
										i === 0
											? "这是一个很棒的平台！我一直在寻找可以帮助开发者在全球范围内展示他们作品的工具。"
											: i === 1
												? "我喜欢Evame如何自动处理翻译。作为一个会说多种语言的开发者，这正是我所需要的。"
												: "评论的自动翻译是一个改变游戏规则的功能。现在我可以与全世界的开发者交流了！",
									userId: userId,
								},
							],
						},
					},
				},
			},
		});

		console.log(`Created comment ${i + 1} with ID: ${comment.id}`);
	}

	console.log("Sample comments created successfully");
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
