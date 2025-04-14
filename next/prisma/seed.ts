import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JA_HERO_HEADER = "開発者のためのグローバルコミュニティ";
const JA_HERO_TEXT = `『Evame』は、開発者がプロジェクトを世界に広め、グローバルなユーザーを獲得できる多言語コミュニティです。
技術的な解説やストーリーを記事として発信したり、取り組んでいる製品やプロジェクトを共有し、世界中の開発者やユーザーと交流できます。
言語の壁を気にせず、グローバルな認知度アップと技術交流を同時に実現しましょう。`;

const JA_OUR_PROBLEM_HEADER = "言語の壁が、あなたの可能性を閉じ込めている";
const JA_OUR_PROBLEM_1_HEADER = "自動で多言語に拡がる";
const JA_OUR_PROBLEM_1_TEXT = `どれほど優れたプロジェクトでも、一つの言語だけでは世界の半分以上に届いていません。
Evameなら、投稿内容がAIによって自動的に多言語に翻訳され、あなたのアイデアが自然に世界へ広がります。`;

const JA_OUR_PROBLEM_2_HEADER = "開発の想いが支援につながる";
const JA_OUR_PROBLEM_2_TEXT = `技術や製品の背後にある熱意や挑戦が伝われば、それはただの投稿ではなく、支援を呼び込む物語になります。
Evameなら、その想いが世界に届き、自然と応援や協力の輪が広がります。`;

const JA_OUR_PROBLEM_3_HEADER = "グローバルな技術コミュニティ";
const JA_OUR_PROBLEM_3_TEXT = `言語の違いで、国をまたいだ技術的な対話や協力が難しくなっています。
Evameでは、コメントや議論も自動で翻訳され、世界中の開発者とリアルタイムにアイデアを共有し、協力し合える環境が整っています。`;

const JA_OUR_PROBLEM_4_HEADER = "書きやすいエディタ";
const JA_OUR_PROBLEM_4_TEXT = `翻訳や書式、使いにくい入力画面が創作の妨げになっていませんか？
Evameでは、Markdown対応でPCでもモバイルでも快適なエディタを用意。自然に書くだけでAIが自動で翻訳処理を行い、あなたは書くことに集中できます。`;

const JA_OUR_PROBLEM_5_HEADER = "原文と翻訳を並べて見比べられる";
const JA_OUR_PROBLEM_5_TEXT = `完璧な翻訳は存在しません｡原文を確認しなければならないときがあります｡
Evameでは、上にスクロールすると出てくるフローティングコントローラーを使えば、必要なときに表示をすぐ切り替えて見比べられます。`;

const JA_OUR_PROBLEM_6_HEADER = "継続的な翻訳の改善";
const JA_OUR_PROBLEM_6_TEXT = `自動翻訳の精度には限界があり、改善の余地が放置されがちです。
Evameでは、ユーザーの投票や提案によって翻訳が日々改善されます。試しにこの訳文をクリックしてみてください｡投票や追加のフォームが現れるはずです｡あなたの文章に対するフィードバックも世界中から得られ、継続的に改善できます。`;

const EN_HERO_HEADER = "Global Community for Developers";
const EN_HERO_TEXT = `"Evame" is a multilingual platform where developers can publish projects, articles, and comments, which are automatically translated into multiple languages and shared globally.
Break down language barriers to gain visibility, connect with developers and users around the world, and grow together through global collaboration.`;
const EN_OUR_PROBLEM_HEADER =
	"Language barriers are locking away your potential.";

const EN_OUR_PROBLEM_1_HEADER = "Reach the World Automatically";
const EN_OUR_PROBLEM_1_TEXT = `Even the best project won't reach more than half of the world if shared in only one language.
Evame automatically translates your posts into multiple languages using AI, making it easy for your ideas to spread globally.`;

const EN_OUR_PROBLEM_2_HEADER = "Your Story Inspires Support";
const EN_OUR_PROBLEM_2_TEXT = `No matter how great the technology, people are moved when they understand the passion and challenges behind it.
Evame helps you share your journey with the world, naturally attracting support and encouragement from across the globe.`;

const EN_OUR_PROBLEM_3_HEADER = "A Global Tech Community";
const EN_OUR_PROBLEM_3_TEXT = `Language differences often block international collaboration and feedback.
With Evame, comments and discussions are automatically translated, enabling real-time exchange of ideas with developers around the world.`;

const EN_OUR_PROBLEM_4_HEADER = "An Editor That Lets You Focus on Writing";
const EN_OUR_PROBLEM_4_TEXT = `Struggling with complex formatting or clunky input interfaces that hinder your creativity?
Evame offers a Markdown-supported editor optimized for both PC and mobile. Just write naturally, and AI handles the translation seamlessly, letting you concentrate on your content.`;

const EN_OUR_PROBLEM_5_HEADER = "Easily Compare Original and Translated Texts";
const EN_OUR_PROBLEM_5_TEXT = `Perfect translations are rare; sometimes, you need to check the original text.
With Evame's floating controller, you can swiftly switch between views to compare the original and translated content whenever needed.`;

const EN_OUR_PROBLEM_6_HEADER = "Continuous Translation Improvement";
const EN_OUR_PROBLEM_6_TEXT = `Automatic translations have their limitations, and improvements are often overlooked.
Evame allows users to vote and suggest enhancements, leading to daily improvements in translation quality. Click on a translation to provide feedback, and benefit from a global community's insights to refine your content.`;

const ZH_HERO_HEADER = "面向开发者的全球社区";
const ZH_HERO_TEXT = `Evame 是一个多语言平台，开发者可以发布项目、文章和评论，系统会自动将内容翻译成多种语言并推向全球。
打破语言壁垒，让你的作品获得全球曝光，与世界各地的用户和开发者互动，共同成长。`;
const ZH_OUR_PROBLEM_HEADER = "语言的障碍正在封锁你的潜力。";

const ZH_OUR_PROBLEM_1_HEADER = "自动触达全球用户";
const ZH_OUR_PROBLEM_1_TEXT = `再优秀的项目，如果只使用一种语言发布，也无法触达全球超过一半的用户。
Evame 利用 AI 自动将你的内容翻译成多种语言，让你的想法自然传播到世界各地。`;

const ZH_OUR_PROBLEM_2_HEADER = "让故事赢得全球支持";
const ZH_OUR_PROBLEM_2_TEXT = `再先进的技术，如果没有传达背后的热情与挑战，也难以打动人心。
Evame 帮助你讲述开发的过程和故事，自然吸引来自世界各地的支持与共鸣。`;

const ZH_OUR_PROBLEM_3_HEADER = "构建全球技术社区";
const ZH_OUR_PROBLEM_3_TEXT = `语言差异常常阻碍跨国的合作与反馈。
在 Evame，评论与讨论会被自动翻译，让你可以实时与世界各地的开发者共享想法、协同创新。`;

const ZH_OUR_PROBLEM_4_HEADER = "专注写作的编辑器";
const ZH_OUR_PROBLEM_4_TEXT = `复杂的格式和笨重的输入界面是否妨碍了你的创作？
Evame 提供适配 PC 和移动端的 Markdown 编辑器，自然输入即可由 AI 自动翻译，让你专注创作。`;

const ZH_OUR_PROBLEM_5_HEADER = "轻松对比原文与译文";
const ZH_OUR_PROBLEM_5_TEXT = `没有哪种翻译是完美的，有时你需要查阅原文。
Evame 的浮动控制器支持一键切换视图，让你随时比对原文与译文内容。`;

const ZH_OUR_PROBLEM_6_HEADER = "翻译质量持续进化";
const ZH_OUR_PROBLEM_6_TEXT = `自动翻译有其局限，许多平台缺乏改进机制。
在 Evame，你可以对翻译进行投票或提交修改建议，系统会不断优化翻译质量。点击任一译文即可反馈，让全球社区帮助你完善内容。`;

const KO_HERO_HEADER = "개발자를 위한 글로벌 커뮤니티";
const KO_HERO_TEXT = `Evame는 개발자가 프로젝트, 글, 댓글을 게시하면 AI가 자동으로 여러 언어로 번역하여 전 세계에 퍼뜨리는 다국어 플랫폼입니다.
언어 장벽을 허물고 전 세계 사용자 및 개발자와 연결되어 함께 성장하세요.`;

const KO_OUR_PROBLEM_HEADER = "언어 장벽이 당신의 가능성을 가두고 있습니다.";

const KO_OUR_PROBLEM_1_HEADER = "자동으로 세계에 도달하세요";
const KO_OUR_PROBLEM_1_TEXT = `아무리 훌륭한 프로젝트라도 하나의 언어로만 공유하면 전 세계 절반 이상의 사용자에게 도달하지 못합니다.
Evame는 게시물을 AI로 다국어로 자동 번역하여 아이디어가 자연스럽게 전 세계로 확산됩니다.`;

const KO_OUR_PROBLEM_2_HEADER = "당신의 이야기가 응원을 이끕니다";
const KO_OUR_PROBLEM_2_TEXT = `아무리 뛰어난 기술이라도, 그 안에 담긴 열정과 도전이 전해지지 않으면 사람들의 마음을 움직이기 어렵습니다.
Evame를 통해 개발 여정을 공유하고, 전 세계로부터 자연스럽게 공감과 응원을 받을 수 있습니다.`;

const KO_OUR_PROBLEM_3_HEADER = "글로벌 기술 커뮤니티";
const KO_OUR_PROBLEM_3_TEXT = `언어 차이는 국제적인 협력과 피드백을 어렵게 만듭니다.
Evame에서는 댓글과 토론이 자동 번역되어, 세계 각국의 개발자들과 실시간으로 아이디어를 주고받을 수 있습니다.`;

const KO_OUR_PROBLEM_4_HEADER = "글쓰기에 집중할 수 있는 에디터";
const KO_OUR_PROBLEM_4_TEXT = `복잡한 포맷이나 불편한 입력 화면이 창작을 방해하고 있진 않나요?
Evame는 PC와 모바일 모두에 최적화된 Markdown 에디터를 제공하며, 자연스럽게 작성하기만 하면 AI가 자동으로 번역을 처리해줍니다.`;

const KO_OUR_PROBLEM_5_HEADER = "원문과 번역을 쉽게 비교";
const KO_OUR_PROBLEM_5_TEXT = `완벽한 번역은 드뭅니다. 때때로 원문을 확인해야 할 때가 있죠.
Evame의 플로팅 컨트롤러를 사용하면 원문과 번역을 언제든지 손쉽게 전환해 비교할 수 있습니다.`;

const KO_OUR_PROBLEM_6_HEADER = "지속적으로 개선되는 번역 품질";
const KO_OUR_PROBLEM_6_TEXT = `자동 번역은 한계가 있으며, 많은 플랫폼에서는 품질 개선이 이루어지지 않습니다.
Evame는 사용자 투표와 제안을 통해 매일 번역 품질이 향상되며, 번역문을 클릭해 쉽게 피드백을 제공할 수 있습니다. 전 세계 커뮤니티의 힘으로 더 나은 콘텐츠를 만들어보세요.`;

const ES_HERO_HEADER = "Comunidad global para desarrolladores";
const ES_HERO_TEXT = `Evame es una plataforma multilingüe donde los desarrolladores pueden publicar proyectos, artículos y comentarios que se traducen automáticamente a varios idiomas y se comparten globalmente.
Rompe las barreras del idioma, conéctate con desarrolladores de todo el mundo y haz crecer tu comunidad con colaboración internacional.`;
const ES_OUR_PROBLEM_HEADER =
	"Las barreras del idioma están encerrando tu potencial.";

const ES_OUR_PROBLEM_1_HEADER = "Llega al mundo automáticamente";
const ES_OUR_PROBLEM_1_TEXT = `Incluso el mejor proyecto no llegará a más de la mitad del mundo si se publica solo en un idioma.
Evame traduce automáticamente tus publicaciones a múltiples idiomas mediante IA, lo que permite que tus ideas se difundan globalmente con facilidad.`;

const ES_OUR_PROBLEM_2_HEADER = "Tu historia inspira apoyo";
const ES_OUR_PROBLEM_2_TEXT = `Por muy avanzada que sea la tecnología, lo que realmente conmueve es conocer la pasión y los desafíos detrás de ella.
Evame te ayuda a compartir tu camino con el mundo, atrayendo apoyo y ánimo de todas partes de forma natural.`;

const ES_OUR_PROBLEM_3_HEADER = "Una comunidad tecnológica global";
const ES_OUR_PROBLEM_3_TEXT = `Las diferencias de idioma dificultan la colaboración internacional y el intercambio de ideas.
Con Evame, los comentarios y debates se traducen automáticamente, permitiendo que los desarrolladores compartan ideas en tiempo real sin importar su idioma.`;

const ES_OUR_PROBLEM_4_HEADER = "Un editor que te permite concentrarte";
const ES_OUR_PROBLEM_4_TEXT = `¿Te distraen los formatos complicados o las interfaces poco intuitivas?
Evame ofrece un editor compatible con Markdown optimizado para PC y móviles. Solo escribe con naturalidad y la IA se encarga de la traducción, para que puedas enfocarte en tu contenido.`;

const ES_OUR_PROBLEM_5_HEADER = "Compara fácilmente original y traducción";
const ES_OUR_PROBLEM_5_TEXT = `Las traducciones perfectas no existen. A veces, es necesario revisar el texto original.
Con el controlador flotante de Evame, puedes cambiar rápidamente entre vistas para comparar fácilmente el original con la traducción.`;

const ES_OUR_PROBLEM_6_HEADER = "Traducción en mejora constante";
const ES_OUR_PROBLEM_6_TEXT = `Las traducciones automáticas tienen limitaciones, y muchas veces no se actualizan.
En Evame, los usuarios pueden votar o proponer mejoras, lo que permite que la calidad de las traducciones mejore a diario. Solo haz clic en el texto traducido para enviar tu opinión y aprovecha el poder de la comunidad global.`;

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
					text: EN_OUR_PROBLEM_4_HEADER,
					textAndOccurrenceHash: "evame-en-segment-9",
					translations: {
						ja: JA_OUR_PROBLEM_4_HEADER,
						zh: ZH_OUR_PROBLEM_4_HEADER,
						ko: KO_OUR_PROBLEM_4_HEADER,
						es: ES_OUR_PROBLEM_4_HEADER,
					},
				},
				{
					number: 10,
					text: EN_OUR_PROBLEM_4_TEXT,
					textAndOccurrenceHash: "evame-en-segment-10",
					translations: {
						ja: JA_OUR_PROBLEM_4_TEXT,
						zh: ZH_OUR_PROBLEM_4_TEXT,
						ko: KO_OUR_PROBLEM_4_TEXT,
						es: ES_OUR_PROBLEM_4_TEXT,
					},
				},
				{
					number: 11,
					text: EN_OUR_PROBLEM_5_HEADER,
					textAndOccurrenceHash: "evame-en-segment-11",
					translations: {
						ja: JA_OUR_PROBLEM_5_HEADER,
						zh: ZH_OUR_PROBLEM_5_HEADER,
						ko: KO_OUR_PROBLEM_5_HEADER,
						es: ES_OUR_PROBLEM_5_HEADER,
					},
				},
				{
					number: 12,
					text: EN_OUR_PROBLEM_5_TEXT,
					textAndOccurrenceHash: "evame-en-segment-12",
					translations: {
						ja: JA_OUR_PROBLEM_5_TEXT,
						zh: ZH_OUR_PROBLEM_5_TEXT,
						ko: KO_OUR_PROBLEM_5_TEXT,
						es: ES_OUR_PROBLEM_5_TEXT,
					},
				},
				{
					number: 13,
					text: EN_OUR_PROBLEM_6_HEADER,
					textAndOccurrenceHash: "evame-en-segment-13",
					translations: {
						ja: JA_OUR_PROBLEM_6_HEADER,
						zh: ZH_OUR_PROBLEM_6_HEADER,
						ko: KO_OUR_PROBLEM_6_HEADER,
						es: ES_OUR_PROBLEM_6_HEADER,
					},
				},
				{
					number: 14,
					text: EN_OUR_PROBLEM_6_TEXT,
					textAndOccurrenceHash: "evame-en-segment-14",
					translations: {
						ja: JA_OUR_PROBLEM_6_HEADER,
						zh: ZH_OUR_PROBLEM_6_HEADER,
						ko: KO_OUR_PROBLEM_6_HEADER,
						es: ES_OUR_PROBLEM_6_HEADER,
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
					text: JA_OUR_PROBLEM_4_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-9",
					translations: {
						en: EN_OUR_PROBLEM_4_HEADER,
						zh: ZH_OUR_PROBLEM_4_HEADER,
						ko: KO_OUR_PROBLEM_4_HEADER,
						es: ES_OUR_PROBLEM_4_HEADER,
					},
				},
				{
					number: 10,
					text: JA_OUR_PROBLEM_4_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-10",
					translations: {
						en: EN_OUR_PROBLEM_4_TEXT,
						zh: ZH_OUR_PROBLEM_4_TEXT,
						ko: KO_OUR_PROBLEM_4_TEXT,
						es: ES_OUR_PROBLEM_4_TEXT,
					},
				},
				{
					number: 11,
					text: JA_OUR_PROBLEM_5_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-11",
					translations: {
						en: EN_OUR_PROBLEM_5_HEADER,
						zh: ZH_OUR_PROBLEM_5_HEADER,
						ko: KO_OUR_PROBLEM_5_HEADER,
						es: ES_OUR_PROBLEM_5_HEADER,
					},
				},
				{
					number: 12,
					text: JA_OUR_PROBLEM_5_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-12",
					translations: {
						en: EN_OUR_PROBLEM_5_TEXT,
						zh: ZH_OUR_PROBLEM_5_TEXT,
						ko: KO_OUR_PROBLEM_5_TEXT,
						es: ES_OUR_PROBLEM_5_TEXT,
					},
				},
				{
					number: 13,
					text: JA_OUR_PROBLEM_6_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-13",
					translations: {
						en: EN_OUR_PROBLEM_6_HEADER,
						zh: ZH_OUR_PROBLEM_6_HEADER,
						ko: KO_OUR_PROBLEM_6_HEADER,
						es: ES_OUR_PROBLEM_6_HEADER,
					},
				},
				{
					number: 14,
					text: JA_OUR_PROBLEM_6_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-14",
					translations: {
						en: EN_OUR_PROBLEM_6_TEXT,
						zh: ZH_OUR_PROBLEM_6_TEXT,
						ko: KO_OUR_PROBLEM_6_TEXT,
						es: ES_OUR_PROBLEM_6_TEXT,
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
