import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JA_HERO_HEADER = "多言語ブログ";
const JA_HERO_TEXT = `『Evame』は記事もコメントも自動翻訳する多言語ブログプラットフォームです。
言語の壁を超え､あなたの言葉を世界に届け、国際的な交流や知識の共有を手軽に実現します。
もっと多くの人に読んでほしいブロガーやライター、国際的なコミュニティを築きたい企業・メディア、グローバルに知識や情報を共有したい研究者や教育者・専門家に最適です。
Evameで世界への扉を開きましょう。`;
const JA_OUR_PROBLEM_HEADER = "言語の壁が、あなたの可能性を閉じ込めている";
const JA_OUR_PROBLEM_1_HEADER = "限られた読者層";
const JA_OUR_PROBLEM_1_TEXT = `どれだけ価値ある記事を書いても、一つの言語では潜在読者の90%以上にリーチできず、
本来届くべき世界中の人々にあなたのメッセージが届いていません。`;
const JA_OUR_PROBLEM_2_HEADER = "高すぎる多言語化のコストと手間";
const JA_OUR_PROBLEM_2_TEXT = `専門の翻訳サービスは1記事あたり数万円のコストがかかり、自力で多言語対応するには膨大な時間と専門知識が必要。
結果として多言語展開を諦めるケースが多発しています。`;
const JA_OUR_PROBLEM_3_HEADER = "国際的な出会いの機会損失";
const JA_OUR_PROBLEM_3_TEXT = `言語の異なる読者からのコメントやフィードバックを得られず、
世界中の視点や知見を取り入れる貴重な機会を逃しています。`;

const JA_OUR_SOLUTION_HEADER = "あなたの想いを世界に届ける";
const JA_OUR_SOLUTION_1_HEADER = "世界の読者を獲得";
const JA_OUR_SOLUTION_1_TEXT = `『Evame』なら、あなたがいつものように書くだけで自動で翻訳。
世界中の何十億人もの読者にリーチし、メッセージを国際的に広げられます。`;
const JA_OUR_SOLUTION_2_HEADER = "無料で多言語対応";
const JA_OUR_SOLUTION_2_TEXT = `『Evame』なら、多言語対応を無料で始められます。
`;
const JA_OUR_SOLUTION_3_HEADER = "新たな出会いの機会";
const JA_OUR_SOLUTION_3_TEXT = `『Evame』なら、言語の違いを超えて、世界中の読者との新たな出会いを手軽に実現できます。
異なる言語・文化圏の読者からフィードバックを得ることで、新しい視点や考え方に触れ、あなたの思考と創造性を広げます。`;

const EN_HERO_HEADER = "Multilingual Blog";
const EN_HERO_TEXT = `"Evame" is a multilingual blogging platform that automatically translates both articles and comments.
Overcome language barriers, share your words globally, and effortlessly facilitate international exchange and knowledge sharing.
Ideal for bloggers and writers seeking a wider audience, companies and media aiming to build global communities, and researchers, educators, and experts wishing to globally share their knowledge and information.
Open the door to the world with Evame.`;

const EN_OUR_PROBLEM_HEADER =
	"Language barriers are holding back your potential.";
const EN_OUR_PROBLEM_1_HEADER = "Limited readership";
const EN_OUR_PROBLEM_1_TEXT = `No matter how valuable your articles are, using just one language prevents you from reaching over 90% of potential readers.
Your message isn't reaching the global audience it deserves.`;

const EN_OUR_PROBLEM_2_HEADER =
	"High cost and effort for multilingual translation";
const EN_OUR_PROBLEM_2_TEXT = `Professional translation services cost hundreds of dollars per article, and self-translation requires considerable time and expertise.
As a result, many give up on multilingual expansion.`;

const EN_OUR_PROBLEM_3_HEADER = "Lost international opportunities";
const EN_OUR_PROBLEM_3_TEXT = `You miss valuable feedback and insights from readers of different languages,
missing chances to integrate global perspectives and ideas.`;

const EN_OUR_SOLUTION_HEADER = "Deliver your voice to the world";
const EN_OUR_SOLUTION_1_HEADER = "Reach a global audience";
const EN_OUR_SOLUTION_1_TEXT = `With "Evame", simply write as you always do, and your articles are automatically translated.
Reach billions of readers worldwide and amplify your message globally.`;

const EN_OUR_SOLUTION_2_HEADER = "Multilingual support for free";
const EN_OUR_SOLUTION_2_TEXT = `With "Evame", you can start multilingual blogging at no cost.`;

const EN_OUR_SOLUTION_3_HEADER = "New international opportunities";
const EN_OUR_SOLUTION_3_TEXT = `With "Evame", easily connect with readers across languages and cultures.
Gain valuable feedback from diverse international readers, expanding your perspective and creativity.`;

const ZH_HERO_HEADER = "多语言博客";
const ZH_HERO_TEXT = `『Evame』是一个自动翻译文章和评论的多语言博客平台。
突破语言障碍，让您的话语传遍世界，轻松实现国际交流与知识共享。
非常适合希望更多人阅读的博主和作家、想建立国际社区的企业与媒体，以及希望全球分享知识与信息的研究人员、教育者和专家。
用Evame打开通往世界的大门吧。`;

const ZH_OUR_PROBLEM_HEADER = "语言障碍限制了您的潜力。";
const ZH_OUR_PROBLEM_1_HEADER = "读者群有限";
const ZH_OUR_PROBLEM_1_TEXT = `无论您的文章多么有价值，仅使用一种语言将使您无法触及90%以上的潜在读者。
您的信息未能传递给全球应有的受众。`;

const ZH_OUR_PROBLEM_2_HEADER = "多语言翻译成本与精力过高";
const ZH_OUR_PROBLEM_2_TEXT = `专业翻译服务每篇文章花费数百美元，自行翻译又需要大量的时间和专业知识。
因此，许多人放弃了多语言扩展。`;

const ZH_OUR_PROBLEM_3_HEADER = "国际机会的流失";
const ZH_OUR_PROBLEM_3_TEXT = `您无法获得来自不同语言读者的反馈和见解，
错失整合全球视角与想法的宝贵机会。`;

const ZH_OUR_SOLUTION_HEADER = "让您的声音传遍世界";
const ZH_OUR_SOLUTION_1_HEADER = "触及全球读者";
const ZH_OUR_SOLUTION_1_TEXT = `使用『Evame』，您只需像平常一样撰写文章，即可自动翻译。
轻松接触全球数十亿读者，将您的信息传播到国际范围。`;

const ZH_OUR_SOLUTION_2_HEADER = "免费实现多语言支持";
const ZH_OUR_SOLUTION_2_TEXT = "使用『Evame』，您可以免费开始多语言博客。";

const ZH_OUR_SOLUTION_3_HEADER = "新的国际交流机会";
const ZH_OUR_SOLUTION_3_TEXT = `使用『Evame』，您可轻松与全球读者互动。
获得多元国际读者的反馈，拓展您的视野与创造力。`;

const KO_HERO_HEADER = "다국어 블로그";
const KO_HERO_TEXT = `『Evame』는 기사와 댓글이 모두 자동으로 번역되는 다국어 블로그 플랫폼입니다.
언어의 장벽을 넘어 당신의 메시지를 세계에 전하고 국제적 교류와 지식 공유를 간편히 실현합니다.
더 많은 사람에게 읽히고 싶은 블로거와 작가, 국제적 커뮤니티를 만들고자 하는 기업과 미디어, 글로벌하게 지식과 정보를 공유하고자 하는 연구자, 교육자 및 전문가에게 최적입니다.
Evame에서 세계로 향하는 문을 열어보세요.`;
const KO_OUR_PROBLEM_HEADER = "언어의 장벽이 당신의 가능성을 가두고 있습니다.";

const KO_OUR_PROBLEM_1_HEADER = "한정된 독자층";
const KO_OUR_PROBLEM_1_TEXT = `아무리 가치 있는 글을 써도 단 하나의 언어만 사용하면 전 세계 잠재 독자의 90% 이상에게 도달할 수 없습니다.
당신의 메시지가 전달되어야 할 글로벌 독자들에게 닿지 않고 있습니다.`;

const KO_OUR_PROBLEM_2_HEADER = "높은 다국어 번역 비용과 부담";
const KO_OUR_PROBLEM_2_TEXT = `전문 번역 서비스는 한 기사당 수십만 원의 비용이 들고, 직접 다국어 번역을 하려면 막대한 시간과 전문지식이 필요합니다.
결국 많은 이들이 다국어 확장을 포기하고 있습니다.`;

const KO_OUR_PROBLEM_3_HEADER = "국제적 소통 기회의 상실";
const KO_OUR_PROBLEM_3_TEXT =
	"다른 언어의 독자들로부터 댓글이나 피드백을 얻지 못해 전 세계의 다양한 관점과 지식을 받아들일 소중한 기회를 놓치고 있습니다.";

const KO_OUR_SOLUTION_HEADER = "당신의 생각을 세계에 전하세요.";

const KO_OUR_SOLUTION_1_HEADER = "글로벌 독자층 확보";
const KO_OUR_SOLUTION_1_TEXT = `"Evame"에서는 평소처럼 글을 쓰기만 하면 자동으로 번역됩니다.
전 세계 수십억 명의 독자에게 도달하여 메시지를 글로벌하게 확산할 수 있습니다.`;

const KO_OUR_SOLUTION_2_HEADER = "무료로 다국어 지원";
const KO_OUR_SOLUTION_2_TEXT = `"Evame"에서는 다국어 블로그를 무료로 시작할 수 있습니다.`;

const KO_OUR_SOLUTION_3_HEADER = "새로운 국제적 교류 기회";
const KO_OUR_SOLUTION_3_TEXT = `"Evame"를 통해 언어 장벽을 넘어 전 세계 독자와 쉽게 교류할 수 있습니다.
다양한 문화권 독자의 피드백을 통해 새로운 관점과 창의력을 넓혀 보세요.`;
const ES_HERO_HEADER = "Blog multilingüe";
const ES_HERO_TEXT = `Evame es una plataforma de blogs multilingüe que traduce automáticamente artículos y comentarios.
Supera las barreras del idioma, lleva tus palabras al mundo y facilita fácilmente la interacción internacional y el intercambio de conocimiento.
Ideal para blogueros y escritores que desean más lectores, empresas y medios que buscan crear comunidades internacionales, e investigadores, educadores o expertos que quieren compartir conocimientos e información a nivel global.
Abre la puerta al mundo con Evame.`;
const ES_OUR_PROBLEM_HEADER =
	"Las barreras del idioma están limitando tu potencial.";

const ES_OUR_PROBLEM_1_HEADER = "Audiencia limitada";
const ES_OUR_PROBLEM_1_TEXT = `Por muy valiosos que sean tus artículos, utilizando un solo idioma no puedes llegar a más del 90% de los lectores potenciales.
Tu mensaje no está llegando a la audiencia global que merece.`;

const ES_OUR_PROBLEM_2_HEADER =
	"Alto costo y esfuerzo en traducción multilingüe";
const ES_OUR_PROBLEM_2_TEXT = `Los servicios de traducción profesional cuestan cientos de dólares por artículo, y traducir por tu cuenta requiere mucho tiempo y conocimientos específicos.
Como resultado, muchos renuncian a expandirse a otros idiomas.`;

const ES_OUR_PROBLEM_3_HEADER = "Oportunidades internacionales perdidas";
const ES_OUR_PROBLEM_3_TEXT = `Pierdes valiosos comentarios y perspectivas de lectores en otros idiomas,
desaprovechando oportunidades únicas para integrar ideas y visiones globales.`;

const ES_OUR_SOLUTION_HEADER = "Lleva tu mensaje al mundo.";

const ES_OUR_SOLUTION_1_HEADER = "Alcanza una audiencia global";
const ES_OUR_SOLUTION_1_TEXT = `Con "Evame", simplemente escribe como siempre y tus artículos se traducirán automáticamente.
Llega a miles de millones de lectores en todo el mundo y amplía tu mensaje globalmente.`;

const ES_OUR_SOLUTION_2_HEADER = "Soporte multilingüe gratuito";
const ES_OUR_SOLUTION_2_TEXT = `Con "Evame", puedes comenzar tu blog multilingüe sin ningún costo.`;

const ES_OUR_SOLUTION_3_HEADER = "Nuevas oportunidades internacionales";
const ES_OUR_SOLUTION_3_TEXT = `Con "Evame", conecta fácilmente con lectores de diferentes idiomas y culturas.
Obtén valiosos comentarios internacionales, ampliando así tu perspectiva y creatividad.`;

const JA_FEATURE_HEADER = "主な機能";
const JA_FEATURE_1_HEADER = "翻訳";
const JA_FEATURE_1_TEXT =
	"記事やコメントが自動的に複数の言語に翻訳され、言語の壁を取り払います。";
const JA_FEATURE_2_HEADER = "使いやすいエディタ";
const JA_FEATURE_2_TEXT =
	"Markdownをサポートする､PCでもモバイルでも使いやすいエディタ。自然に書くだけで、AIが翻訳をシームレスに処理します。";
const JA_FEATURE_3_HEADER = "継続的な改善";
const JA_FEATURE_3_TEXT =
	"ユーザーの投票やコミュニティによる新しい翻訳の追加により、翻訳は継続的に改善されます。試しにこの訳文をクリックしてみてください｡投票や追加のフォームが現れるはずです｡";

const EN_FEATURE_HEADER = "Key Features";
const EN_FEATURE_1_HEADER = "Translation";
const EN_FEATURE_1_TEXT =
	"Articles and comments are automatically translated into multiple languages, breaking down language barriers.";
const EN_FEATURE_2_HEADER = "Easy-to-use Editor";
const EN_FEATURE_2_TEXT =
	"A user-friendly editor both on PC and mobile, supporting Markdown. Just write naturally and let the AI handle translations seamlessly.";
const EN_FEATURE_3_HEADER = "Continuous Improvement";
const EN_FEATURE_3_TEXT =
	"Translations continuously improve through user voting and the addition of new translations by the community. Try clicking on this translation to see the voting and addition form.";

const ZH_FEATURE_HEADER = "主要功能";
const ZH_FEATURE_1_HEADER = "翻译";
const ZH_FEATURE_1_TEXT = "文章和评论自动翻译成多种语言，打破语言障碍。";
const ZH_FEATURE_2_HEADER = "易用的编辑器";
const ZH_FEATURE_2_TEXT =
	"支持Markdown的PC和移动设备用户友好编辑器。只需自然书写，让AI无缝处理翻译。";
const ZH_FEATURE_3_HEADER = "持续改进";
const ZH_FEATURE_3_TEXT =
	"通过用户投票和社区添加新翻译，翻译质量不断提高。 试一试点击这个翻译，看看投票和添加表单是否会出现。";

const KO_FEATURE_HEADER = "주요 기능";
const KO_FEATURE_1_HEADER = "번역";
const KO_FEATURE_1_TEXT =
	"글과 댓글이 여러 언어로 자동 번역되어 언어 장벽을 허물어 줍니다.";
const KO_FEATURE_2_HEADER = "사용하기 쉬운 에디터";
const KO_FEATURE_2_TEXT =
	"마크다운을 지원하는 PC와 모바일 사용자 친화적인 에디터. 자연스럽게 작성하면 AI가 번역을 원활하게 처리합니다.";
const KO_FEATURE_3_HEADER = "지속적인 개선";
const KO_FEATURE_3_TEXT =
	"사용자 투표와 커뮤니티의 새로운 번역 추가를 통해 번역이 지속적으로 개선됩니다. 이 번역을 클릭해 보세요. 투표 및 추가 폼이 나타나야 합니다.";

const ES_FEATURE_HEADER = "Características principales";
const ES_FEATURE_1_HEADER = "Traducción";
const ES_FEATURE_1_TEXT =
	"Los artículos y comentarios se traducen automáticamente a varios idiomas, eliminando las barreras lingüísticas.";
const ES_FEATURE_2_HEADER = "Editor fácil de usar";
const ES_FEATURE_2_TEXT =
	"Un editor amigable tanto en PC como en móvil, que soporta Markdown. Solo escribe naturalmente y deja que la IA maneje las traducciones sin problemas.";
const ES_FEATURE_3_HEADER = "Mejora continua";
const ES_FEATURE_3_TEXT =
	"Las traducciones mejoran continuamente a través de los votos de los usuarios y la adición de nuevas traducciones por parte de la comunidad. Intenta hacer clic en esta traducción para ver el formulario de votación y adición.";

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
					text: EN_OUR_SOLUTION_HEADER,
					textAndOccurrenceHash: "evame-en-segment-9",
					translations: {
						ja: JA_OUR_SOLUTION_HEADER,
						zh: ZH_OUR_SOLUTION_HEADER,
						ko: KO_OUR_SOLUTION_HEADER,
						es: ES_OUR_SOLUTION_HEADER,
					},
				},
				{
					number: 10,
					text: EN_OUR_SOLUTION_1_HEADER,
					textAndOccurrenceHash: "evame-en-segment-10",
					translations: {
						ja: JA_OUR_SOLUTION_1_HEADER,
						zh: ZH_OUR_SOLUTION_1_HEADER,
						ko: KO_OUR_SOLUTION_1_HEADER,
						es: ES_OUR_SOLUTION_1_HEADER,
					},
				},
				{
					number: 11,
					text: EN_OUR_SOLUTION_1_TEXT,
					textAndOccurrenceHash: "evame-en-segment-11",
					translations: {
						ja: JA_OUR_SOLUTION_1_TEXT,
						zh: ZH_OUR_SOLUTION_1_TEXT,
						ko: KO_OUR_SOLUTION_1_TEXT,
						es: ES_OUR_SOLUTION_1_TEXT,
					},
				},
				{
					number: 12,
					text: EN_OUR_SOLUTION_2_HEADER,
					textAndOccurrenceHash: "evame-en-segment-12",
					translations: {
						ja: JA_OUR_SOLUTION_2_HEADER,
						zh: ZH_OUR_SOLUTION_2_HEADER,
						ko: KO_OUR_SOLUTION_2_HEADER,
						es: ES_OUR_SOLUTION_2_HEADER,
					},
				},
				{
					number: 13,
					text: EN_OUR_SOLUTION_2_TEXT,
					textAndOccurrenceHash: "evame-en-segment-13",
					translations: {
						ja: JA_OUR_SOLUTION_2_TEXT,
						zh: ZH_OUR_SOLUTION_2_TEXT,
						ko: KO_OUR_SOLUTION_2_TEXT,
						es: ES_OUR_SOLUTION_2_TEXT,
					},
				},
				{
					number: 14,
					text: EN_OUR_SOLUTION_3_HEADER,
					textAndOccurrenceHash: "evame-en-segment-14",
					translations: {
						ja: JA_OUR_SOLUTION_3_HEADER,
						zh: ZH_OUR_SOLUTION_3_HEADER,
						ko: KO_OUR_SOLUTION_3_HEADER,
						es: ES_OUR_SOLUTION_3_HEADER,
					},
				},
				{
					number: 15,
					text: EN_OUR_SOLUTION_3_TEXT,
					textAndOccurrenceHash: "evame-en-segment-15",
					translations: {
						ja: JA_OUR_SOLUTION_3_TEXT,
						zh: ZH_OUR_SOLUTION_3_TEXT,
						ko: KO_OUR_SOLUTION_3_TEXT,
						es: ES_OUR_SOLUTION_3_TEXT,
					},
				},
				{
					number: 16,
					text: EN_FEATURE_HEADER,
					textAndOccurrenceHash: "evame-en-segment-16",
					translations: {
						ja: JA_FEATURE_HEADER,
						zh: ZH_FEATURE_HEADER,
						ko: KO_FEATURE_HEADER,
						es: ES_FEATURE_HEADER,
					},
				},
				{
					number: 17,
					text: EN_FEATURE_1_HEADER,
					textAndOccurrenceHash: "evame-en-segment-17",
					translations: {
						ja: JA_FEATURE_1_HEADER,
						zh: ZH_FEATURE_1_HEADER,
						ko: KO_FEATURE_1_HEADER,
						es: ES_FEATURE_1_HEADER,
					},
				},
				{
					number: 18,
					text: EN_FEATURE_1_TEXT,
					textAndOccurrenceHash: "evame-en-segment-18",
					translations: {
						ja: JA_FEATURE_1_TEXT,
						zh: ZH_FEATURE_1_TEXT,
						ko: KO_FEATURE_1_TEXT,
						es: ES_FEATURE_1_TEXT,
					},
				},
				{
					number: 19,
					text: EN_FEATURE_2_HEADER,
					textAndOccurrenceHash: "evame-en-segment-19",
					translations: {
						ja: JA_FEATURE_2_HEADER,
						zh: ZH_FEATURE_2_HEADER,
						ko: KO_FEATURE_2_HEADER,
						es: ES_FEATURE_2_HEADER,
					},
				},
				{
					number: 20,
					text: EN_FEATURE_2_TEXT,
					textAndOccurrenceHash: "evame-en-segment-20",
					translations: {
						ja: JA_FEATURE_2_TEXT,
						zh: ZH_FEATURE_2_TEXT,
						ko: KO_FEATURE_2_TEXT,
						es: ES_FEATURE_2_TEXT,
					},
				},
				{
					number: 21,
					text: EN_FEATURE_3_HEADER,
					textAndOccurrenceHash: "evame-en-segment-21",
					translations: {
						ja: JA_FEATURE_3_HEADER,
						zh: ZH_FEATURE_3_HEADER,
						ko: KO_FEATURE_3_HEADER,
						es: ES_FEATURE_3_HEADER,
					},
				},
				{
					number: 22,
					text: EN_FEATURE_3_TEXT,
					textAndOccurrenceHash: "evame-en-segment-22",
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
					text: JA_OUR_SOLUTION_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-9",
					translations: {
						en: EN_OUR_SOLUTION_HEADER,
						zh: ZH_OUR_SOLUTION_HEADER,
						ko: KO_OUR_SOLUTION_HEADER,
						es: ES_OUR_SOLUTION_HEADER,
					},
				},
				{
					number: 10,
					text: JA_OUR_SOLUTION_1_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-10",
					translations: {
						en: EN_OUR_SOLUTION_1_HEADER,
						zh: ZH_OUR_SOLUTION_1_HEADER,
						ko: KO_OUR_SOLUTION_1_HEADER,
						es: ES_OUR_SOLUTION_1_HEADER,
					},
				},
				{
					number: 11,
					text: JA_OUR_SOLUTION_1_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-11",
					translations: {
						en: EN_OUR_SOLUTION_1_TEXT,
						zh: ZH_OUR_SOLUTION_1_TEXT,
						ko: KO_OUR_SOLUTION_1_TEXT,
						es: ES_OUR_SOLUTION_1_TEXT,
					},
				},
				{
					number: 12,
					text: JA_OUR_SOLUTION_2_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-12",
					translations: {
						en: EN_OUR_SOLUTION_2_HEADER,
						zh: ZH_OUR_SOLUTION_2_HEADER,
						ko: KO_OUR_SOLUTION_2_HEADER,
						es: ES_OUR_SOLUTION_2_HEADER,
					},
				},
				{
					number: 13,
					text: JA_OUR_SOLUTION_2_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-13",
					translations: {
						en: EN_OUR_SOLUTION_2_TEXT,
						zh: ZH_OUR_SOLUTION_2_TEXT,
						ko: KO_OUR_SOLUTION_2_TEXT,
						es: ES_OUR_SOLUTION_2_TEXT,
					},
				},
				{
					number: 14,
					text: JA_OUR_SOLUTION_3_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-14",
					translations: {
						en: EN_OUR_SOLUTION_3_HEADER,
						zh: ZH_OUR_SOLUTION_3_HEADER,
						ko: KO_OUR_SOLUTION_3_HEADER,
						es: ES_OUR_SOLUTION_3_HEADER,
					},
				},
				{
					number: 15,
					text: JA_OUR_SOLUTION_3_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-15",
					translations: {
						en: EN_OUR_SOLUTION_3_TEXT,
						zh: ZH_OUR_SOLUTION_3_TEXT,
						ko: KO_OUR_SOLUTION_3_TEXT,
						es: ES_OUR_SOLUTION_3_TEXT,
					},
				},
				{
					number: 16,
					text: JA_FEATURE_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-16",
					translations: {
						en: EN_FEATURE_HEADER,
						zh: ZH_FEATURE_HEADER,
						ko: KO_FEATURE_HEADER,
						es: ES_FEATURE_HEADER,
					},
				},
				{
					number: 17,
					text: JA_FEATURE_1_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-17",
					translations: {
						en: EN_FEATURE_1_HEADER,
						zh: ZH_FEATURE_1_HEADER,
						ko: KO_FEATURE_1_HEADER,
						es: ES_FEATURE_1_HEADER,
					},
				},
				{
					number: 18,
					text: JA_FEATURE_1_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-18",
					translations: {
						en: EN_FEATURE_1_TEXT,
						zh: ZH_FEATURE_1_TEXT,
						ko: KO_FEATURE_1_TEXT,
						es: ES_FEATURE_1_TEXT,
					},
				},
				{
					number: 19,
					text: JA_FEATURE_2_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-19",
					translations: {
						en: EN_FEATURE_2_HEADER,
						zh: ZH_FEATURE_2_HEADER,
						ko: KO_FEATURE_2_HEADER,
						es: ES_FEATURE_2_HEADER,
					},
				},
				{
					number: 20,
					text: JA_FEATURE_2_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-20",
					translations: {
						en: EN_FEATURE_2_TEXT,
						zh: ZH_FEATURE_2_TEXT,
						ko: KO_FEATURE_2_TEXT,
						es: ES_FEATURE_2_TEXT,
					},
				},
				{
					number: 21,
					text: JA_FEATURE_3_HEADER,
					textAndOccurrenceHash: "evame-ja-segment-21",
					translations: {
						en: EN_FEATURE_3_HEADER,
						zh: ZH_FEATURE_3_HEADER,
						ko: KO_FEATURE_3_HEADER,
						es: ES_FEATURE_3_HEADER,
					},
				},
				{
					number: 22,
					text: JA_FEATURE_3_TEXT,
					textAndOccurrenceHash: "evame-ja-segment-22",
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

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
