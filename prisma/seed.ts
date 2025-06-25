import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JA_HERO_HEADER = 'クリエイターのためのグローバルコミュニティ';
const JA_HERO_TEXT = `『Evame』は、クリエイターが作品を世界に広め、グローバルなユーザーを獲得できる多言語コミュニティです。
作品の解説や日々の出来事を発信したり、取り組んでいる作品を共有し、世界中のクリエイターと交流できます。
言語の壁を気にせず、グローバルな認知度アップと交流を同時に実現しましょう。`;

const JA_OUR_PROBLEM_HEADER = '言語の壁が、あなたの可能性を閉じ込めている';
const JA_OUR_PROBLEM_1_HEADER = '自動で多言語に拡がる';
const JA_OUR_PROBLEM_1_TEXT = `どれほど優れた作品でも、一つの言語だけでは世界の半分以上に届いていません。
Evameなら、投稿内容がAIによって自動的に多言語に翻訳され、あなたのアイデアが自然に世界へ広がります。`;

const JA_OUR_PROBLEM_2_HEADER = '想いが支援につながる';
const JA_OUR_PROBLEM_2_TEXT = `作品の背後にある熱意や挑戦が伝われば、それはただの投稿ではなく、支援を呼び込む物語になります。
Evameなら、その想いが世界に届き、自然と応援や協力の輪が広がります。`;

const JA_OUR_PROBLEM_3_HEADER = 'グローバルなコミュニティ';
const JA_OUR_PROBLEM_3_TEXT = `言語の違いで、国をまたいだ技術的な対話や協力が難しくなっています。
Evameでは、記事もコメントも自動で翻訳され、世界中のクリエイターとリアルタイムにアイデアを共有し、協力し合える環境が整っています。`;

const JA_OUR_PROBLEM_4_HEADER = '書きやすいエディタ';
const JA_OUR_PROBLEM_4_TEXT = `翻訳や書式、使いにくい入力画面が創作の妨げになっていませんか？
Evameでは、Markdown対応でPCでもモバイルでも快適なエディタを用意。自然に書くだけでAIが自動で翻訳処理を行い、あなたは書くことに集中できます。`;

const JA_OUR_PROBLEM_5_HEADER = '原文と翻訳を並べて見比べられる';
const JA_OUR_PROBLEM_5_TEXT = `完璧な翻訳は存在しません｡原文を確認しなければならないときがあります｡
Evameでは、上にスクロールすると出てくるフローティングコントローラーを使えば、必要なときに表示をすぐ切り替えて見比べられます。`;

const JA_OUR_PROBLEM_6_HEADER = '継続的な翻訳の改善';
const JA_OUR_PROBLEM_6_TEXT = `自動翻訳の精度には限界があり、改善の余地が放置されがちです。
Evameでは、ユーザーの投票や提案によって翻訳が日々改善されます。試しにこの訳文をクリックしてみてください｡
投票や追加のフォームが現れるはずです｡
あなたの文章の翻訳に対するフィードバックも世界中から得られ、継続的に改善できます。`;

// English Translations (Updated)
const EN_HERO_HEADER = 'Global Community for Creators';
const EN_HERO_TEXT = `"Evame" is a multilingual community where creators can share their work with the world and gain global users.
You can post explanations of your work, daily events, share projects you're working on, and interact with creators from all over the world.
Let's overcome language barriers and achieve global recognition and interaction simultaneously.`;
const EN_OUR_PROBLEM_HEADER =
  'Language barriers are locking away your potential.';

const EN_OUR_PROBLEM_1_HEADER = 'Reach the World Automatically';
const EN_OUR_PROBLEM_1_TEXT = `No matter how excellent your work is, it won't reach more than half the world if it's only in one language.
With Evame, your posts are automatically translated into multiple languages by AI, allowing your ideas to naturally spread across the globe.`;

const EN_OUR_PROBLEM_2_HEADER = 'Your Passion Inspires Support'; // Or "Your Story Inspires Support" if closer to original nuance
const EN_OUR_PROBLEM_2_TEXT = `When the passion and challenges behind your work are conveyed, it's no longer just a post but a story that attracts support.
With Evame, these sentiments reach the world, naturally expanding the circle of support and collaboration.`;

const EN_OUR_PROBLEM_3_HEADER = 'A Global Community';
const EN_OUR_PROBLEM_3_TEXT = `Language differences make cross-border technical dialogue and collaboration difficult.
With Evame, articles and comments are automatically translated, creating an environment where you can share ideas and collaborate in real-time with creators from around the world.`;

const EN_OUR_PROBLEM_4_HEADER = 'An Editor That Lets You Focus on Writing';
const EN_OUR_PROBLEM_4_TEXT = `Are translations, formatting, or difficult-to-use input screens hindering your creation?
Evame provides a comfortable Markdown-enabled editor for both PC and mobile. Just write naturally, and AI will automatically handle the translation, allowing you to focus on writing.`;

const EN_OUR_PROBLEM_5_HEADER = 'Easily Compare Original and Translated Texts';
const EN_OUR_PROBLEM_5_TEXT = `No translation is perfect. There are times when you need to check the original text.
With Evame, you can use the floating controller that appears when you scroll up to quickly switch views and compare when needed.`;

const EN_OUR_PROBLEM_6_HEADER = 'Continuous Translation Improvement';
const EN_OUR_PROBLEM_6_TEXT = `The accuracy of automatic translation has its limits, and room for improvement is often neglected.
At Evame, translations are improved daily through user votes and suggestions. Try clicking on this translated text. A form for voting or adding suggestions should appear.
You can also receive feedback on your text's translation from around the world and continuously improve it.`;

// Chinese (Simplified) Translations (Updated)
const ZH_HERO_HEADER = '创作者的全球社区';
const ZH_HERO_TEXT = `《Evame》是一个多语言社区，创作者可以在这里向世界推广自己的作品并获得全球用户。
您可以发布作品解说、日常动态，分享正在进行的项目，并与来自世界各地的创作者交流。
让我们不用担心语言障碍，同时实现全球知名度的提升和互动交流。`;
const ZH_OUR_PROBLEM_HEADER = '语言的障碍正在封锁你的潜力。';

const ZH_OUR_PROBLEM_1_HEADER = '自动触达全球用户';
const ZH_OUR_PROBLEM_1_TEXT = `无论多么优秀的作品，如果仅以一种语言发布，也无法触及世界上一半以上的用户。
有了 Evame，您的帖子内容会通过 AI 自动翻译成多种语言，让您的创意自然地传播到全世界。`;

const ZH_OUR_PROBLEM_2_HEADER = '让热情赢得全球支持'; // Or "让故事赢得全球支持"
const ZH_OUR_PROBLEM_2_TEXT = `如果能传达作品背后的热情与挑战，那它就不再仅仅是一篇帖子，而是能唤起支持的故事。
有了 Evame，这份心意将传遍世界，自然而然地扩大支持与合作的圈子。`;

const ZH_OUR_PROBLEM_3_HEADER = '全球社区';
const ZH_OUR_PROBLEM_3_TEXT = `语言的差异使得跨国的技术对话与合作变得困难。
在 Evame，文章和评论都会被自动翻译，从而营造出一个可以与世界各地的创作者实时共享创意、携手合作的环境。`;

const ZH_OUR_PROBLEM_4_HEADER = '专注写作的编辑器';
const ZH_OUR_PROBLEM_4_TEXT = `翻译、格式或难用的输入界面是否妨碍了您的创作？
Evame 提供了支持 Markdown、在 PC 和移动设备上均可舒适使用的编辑器。只需自然书写，AI 就会自动进行翻译处理，让您可以专注于写作。`;

const ZH_OUR_PROBLEM_5_HEADER = '轻松对比原文与译文';
const ZH_OUR_PROBLEM_5_TEXT = `不存在完美的翻译。 有时您需要查看原文。
在 Evame 中，您可以使用向上滚动时出现的浮动控制器，在需要时快速切换显示进行比较。`;

const ZH_OUR_PROBLEM_6_HEADER = '翻译质量持续进化';
const ZH_OUR_PROBLEM_6_TEXT = `自动翻译的准确性有其局限，改进的空间往往被忽视。
在 Evame，通过用户的投票和建议，翻译每天都在改进。不妨试试点击这段译文，应该会出现投票或添加建议的表单。
您还可以从世界各地获得对您文章翻译的反馈，并持续改进。`;

// Korean Translations (Updated)
const KO_HERO_HEADER = '크리에이터를 위한 글로벌 커뮤니티';
const KO_HERO_TEXT = `『Evame』은 크리에이터가 작품을 세계에 알리고 글로벌 사용자를 확보할 수 있는 다국어 커뮤니티입니다.
작품 해설이나 일상적인 일을 게시하거나, 진행 중인 작품을 공유하고 전 세계 크리에이터와 교류할 수 있습니다.
언어의 장벽 없이 글로벌 인지도 향상과 교류를 동시에 실현해 보세요.`;

const KO_OUR_PROBLEM_HEADER = '언어 장벽이 당신의 가능성을 가두고 있습니다.';

const KO_OUR_PROBLEM_1_HEADER = '자동으로 세계에 도달하세요';
const KO_OUR_PROBLEM_1_TEXT = `아무리 뛰어난 작품이라도 하나의 언어로만으로는 세계의 절반 이상에게 전달되지 않습니다.
Evame에서는 게시 내용이 AI에 의해 자동으로 다국어로 번역되어 당신의 아이디어가 자연스럽게 세계로 확산됩니다.`;

const KO_OUR_PROBLEM_2_HEADER = '열정이 지원으로 이어집니다'; // Or "당신의 이야기가 응원을 이<0xEF><0x81><0x8D>니다"
const KO_OUR_PROBLEM_2_TEXT = `작품 이면에 있는 열정이나 도전이 전달되면, 그것은 단순한 게시물이 아니라 지원을 불러일으키는 이야기가 됩니다.
Evame에서는 그 마음이 세계에 전달되어 자연스럽게 응원과 협력의 장이 확산됩니다.`;

const KO_OUR_PROBLEM_3_HEADER = '글로벌 커뮤니티';
const KO_OUR_PROBLEM_3_TEXT = `언어 차이로 인해 국가 간 기술적인 대화나 협력이 어려워지고 있습니다.
Evame에서는 기사와 댓글이 모두 자동으로 번역되어, 전 세계 크리에이터들과 실시간으로 아이디어를 공유하고 협력할 수 있는 환경이 마련되어 있습니다.`;

const KO_OUR_PROBLEM_4_HEADER = '글쓰기에 집중할 수 있는 에디터';
const KO_OUR_PROBLEM_4_TEXT = `번역이나 서식, 사용하기 어려운 입력 화면이 창작을 방해하고 있지는 않나요?
Evame에서는 마크다운을 지원하며 PC와 모바일 모두에서 편안한 에디터를 제공합니다. 자연스럽게 작성하기만 하면 AI가 자동으로 번역 처리를 수행하여 글쓰기에만 집중할 수 있습니다.`;

const KO_OUR_PROBLEM_5_HEADER = '원문과 번역을 쉽게 비교';
const KO_OUR_PROBLEM_5_TEXT = `완벽한 번역은 존재하지 않습니다. 원문을 확인해야 할 때가 있습니다.
Evame에서는 위로 스크롤하면 나타나는 플로팅 컨트롤러를 사용하여 필요할 때 표시를 바로 전환하여 비교할 수 있습니다.`;

const KO_OUR_PROBLEM_6_HEADER = '지속적으로 개선되는 번역 품질';
const KO_OUR_PROBLEM_6_TEXT = `자동 번역의 정확도에는 한계가 있으며 개선의 여지가 방치되기 쉽습니다.
Evame에서는 사용자 투표나 제안을 통해 번역이 매일 개선됩니다. 시험 삼아 이 번역문을 클릭해 보세요. 투표나 추가 양식이 나타날 것입니다.
당신의 글 번역에 대한 피드백도 전 세계로부터 받아 지속적으로 개선할 수 있습니다.`;

// Spanish Translations (Updated)
const ES_HERO_HEADER = 'Comunidad global para creadores';
const ES_HERO_TEXT = `"Evame" es una comunidad multilingüe donde los creadores pueden difundir su trabajo al mundo y ganar usuarios globales.
Puedes publicar explicaciones de tus obras, eventos diarios, compartir los proyectos en los que estás trabajando e interactuar con creadores de todo el mundo.
Superemos las barreras del idioma y logremos reconocimiento global e interacción al mismo tiempo.`;
const ES_OUR_PROBLEM_HEADER =
  'Las barreras del idioma están encerrando tu potencial.';

const ES_OUR_PROBLEM_1_HEADER = 'Llega al mundo automáticamente';
const ES_OUR_PROBLEM_1_TEXT = `Por excelente que sea tu obra, si solo está en un idioma, no llegará a más de la mitad del mundo.
Con Evame, tus publicaciones se traducen automáticamente a varios idiomas mediante IA, permitiendo que tus ideas se difundan de forma natural por todo el globo.`;

const ES_OUR_PROBLEM_2_HEADER = 'Tu pasión inspira apoyo'; // Or "Tu historia inspira apoyo"
const ES_OUR_PROBLEM_2_TEXT = `Cuando se transmiten la pasión y los desafíos detrás de tu obra, ya no es solo una publicación, sino una historia que atrae apoyo.
Con Evame, esos sentimientos llegan al mundo, expandiendo naturalmente el círculo de apoyo y colaboración.`;

const ES_OUR_PROBLEM_3_HEADER = 'Una comunidad global';
const ES_OUR_PROBLEM_3_TEXT = `Las diferencias idiomáticas dificultan el diálogo técnico y la colaboración transfronteriza.
En Evame, tanto los artículos como los comentarios se traducen automáticamente, creando un entorno donde puedes compartir ideas y colaborar en tiempo real con creadores de todo el mundo.`;

const ES_OUR_PROBLEM_4_HEADER =
  'Un editor que te permite concentrarte en escribir';
const ES_OUR_PROBLEM_4_TEXT = `¿Las traducciones, el formato o las pantallas de entrada difíciles de usar están obstaculizando tu creación?
Evame ofrece un editor cómodo compatible con Markdown para PC y dispositivos móviles. Simplemente escribe de forma natural y la IA se encargará automáticamente de la traducción, permitiéndote concentrarte en escribir.`;

const ES_OUR_PROBLEM_5_HEADER = 'Compara fácilmente original y traducción';
const ES_OUR_PROBLEM_5_TEXT = `Ninguna traducción es perfecta. Hay momentos en los que necesitas revisar el texto original.
En Evame, puedes usar el controlador flotante que aparece al desplazarte hacia arriba para cambiar rápidamente las vistas y comparar cuando sea necesario.`;

const ES_OUR_PROBLEM_6_HEADER = 'Traducción en mejora constante';
const ES_OUR_PROBLEM_6_TEXT = `La precisión de la traducción automática tiene sus límites, y a menudo se descuida el margen de mejora.
En Evame, las traducciones se mejoran a diario mediante los votos y sugerencias de los usuarios. Intenta hacer clic en este texto traducido. Debería aparecer un formulario para votar o añadir sugerencias.
También puedes recibir comentarios sobre la traducción de tus textos de todo el mundo y mejorarla continuamente.`;
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
          textAndOccurrenceHash: 'evame-en-segment-0',
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
          textAndOccurrenceHash: 'evame-en-segment-1',
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
          textAndOccurrenceHash: 'evame-en-segment-2',
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
          textAndOccurrenceHash: 'evame-en-segment-3',
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
          textAndOccurrenceHash: 'evame-en-segment-4',
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
          textAndOccurrenceHash: 'evame-en-segment-5',
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
          textAndOccurrenceHash: 'evame-en-segment-6',
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
          textAndOccurrenceHash: 'evame-en-segment-7',
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
          textAndOccurrenceHash: 'evame-en-segment-8',
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
          textAndOccurrenceHash: 'evame-en-segment-9',
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
          textAndOccurrenceHash: 'evame-en-segment-10',
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
          textAndOccurrenceHash: 'evame-en-segment-11',
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
          textAndOccurrenceHash: 'evame-en-segment-12',
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
          textAndOccurrenceHash: 'evame-en-segment-13',
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
          textAndOccurrenceHash: 'evame-en-segment-14',
          translations: {
            ja: JA_OUR_PROBLEM_6_TEXT,
            zh: ZH_OUR_PROBLEM_6_TEXT,
            ko: KO_OUR_PROBLEM_6_TEXT,
            es: ES_OUR_PROBLEM_6_TEXT,
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
          textAndOccurrenceHash: 'evame-ja-segment-0',
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
          textAndOccurrenceHash: 'evame-ja-segment-1',
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
          textAndOccurrenceHash: 'evame-ja-segment-2',
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
          textAndOccurrenceHash: 'evame-ja-segment-3',
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
          textAndOccurrenceHash: 'evame-ja-segment-4',
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
          textAndOccurrenceHash: 'evame-ja-segment-5',
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
          textAndOccurrenceHash: 'evame-ja-segment-6',
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
          textAndOccurrenceHash: 'evame-ja-segment-7',
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
          textAndOccurrenceHash: 'evame-ja-segment-8',
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
          textAndOccurrenceHash: 'evame-ja-segment-9',
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
          textAndOccurrenceHash: 'evame-ja-segment-10',
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
          textAndOccurrenceHash: 'evame-ja-segment-11',
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
          textAndOccurrenceHash: 'evame-ja-segment-12',
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
          textAndOccurrenceHash: 'evame-ja-segment-13',
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
          textAndOccurrenceHash: 'evame-ja-segment-14',
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
            })
          ),
        })
    )
  );

  // Process in batches
  for (let i = 0; i < upsertPromises.length; i += BATCH_SIZE) {
    const batch = upsertPromises.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((fn) => fn()));
    console.log(
      `Processed batch ${i / BATCH_SIZE + 1} of ${Math.ceil(upsertPromises.length / BATCH_SIZE)}`
    );
  }

  console.log('Required data added successfully');

  return { evame, evameEnPage, evameJaPage };
}

async function createUserAndPages() {
  const evame = await prisma.user.upsert({
    where: { handle: 'evame' },
    update: {
      provider: 'Admin',
      image: 'https://evame.tech/favicon.svg',
    },
    create: {
      handle: 'evame',
      name: 'evame',
      provider: 'Admin',
      image: 'https://evame.tech/favicon.svg',
      email: 'evame@evame.tech',
    },
  });

  const createPage = async (
    slug: string,
    sourceLocale: string,
    content: string,
    aiLocales: string[]
  ) =>
    prisma.page.upsert({
      where: { slug },
      update: {
        slug,
        sourceLocale,
        mdastJson: content,
        status: 'DRAFT',
        userId: evame.id,
        translationJobs: {
          create: aiLocales.map((locale) => ({
            locale,
            status: 'COMPLETED',
            aiModel: 'test-model',
          })),
        },
      },
      create: {
        slug,
        sourceLocale,
        mdastJson: content,
        status: 'DRAFT',
        userId: evame.id,
        translationJobs: {
          create: aiLocales.map((locale) => ({
            locale,
            status: 'COMPLETED',
            aiModel: 'test-model',
          })),
        },
      },
    });

  const [evameEnPage, evameJaPage] = await Promise.all([
    createPage('evame', 'en', EN_HERO_HEADER, ['ja', 'zh', 'ko', 'es']),
    createPage('evame-ja', 'ja', JA_HERO_HEADER, ['en', 'zh', 'ko', 'es']),
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
