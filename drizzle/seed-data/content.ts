export interface LocaleContent {
	heroHeader: string;
	heroText: string;
	ourProblemHeader: string;
	sections: Array<{ header: string; text: string }>;
}

export const LOCALE_CONTENT: Record<string, LocaleContent> = {
	ja: {
		heroHeader: "クリエイターのためのグローバルコミュニティ",
		heroText: `『Evame』は、クリエイターが作品を世界に広め、グローバルなユーザーを獲得できる多言語コミュニティです。
作品の解説や日々の出来事を発信したり、取り組んでいる作品を共有し、世界中のクリエイターと交流できます。
言語の壁を気にせず、グローバルな認知度アップと交流を同時に実現しましょう。`,
		ourProblemHeader: "言語の壁が、あなたの可能性を閉じ込めている",
		sections: [
			{
				header: "自動で多言語に拡がる",
				text: `どれほど優れた作品でも、一つの言語だけでは世界の半分以上に届いていません。
Evameなら、投稿内容がAIによって自動的に多言語に翻訳され、あなたのアイデアが自然に世界へ広がります。`,
			},
			{
				header: "想いが支援につながる",
				text: `作品の背後にある熱意や挑戦が伝われば、それはただの投稿ではなく、支援を呼び込む物語になります。
Evameなら、その想いが世界に届き、自然と応援や協力の輪が広がります。`,
			},
			{
				header: "グローバルなコミュニティ",
				text: `言語の違いで、国をまたいだ技術的な対話や協力が難しくなっています。
Evameでは、記事もコメントも自動で翻訳され、世界中のクリエイターとリアルタイムにアイデアを共有し、協力し合える環境が整っています。`,
			},
			{
				header: "書きやすいエディタ",
				text: `翻訳や書式、使いにくい入力画面が創作の妨げになっていませんか？
Evameでは、Markdown対応でPCでもモバイルでも快適なエディタを用意。自然に書くだけでAIが自動で翻訳処理を行い、あなたは書くことに集中できます。`,
			},
			{
				header: "原文と翻訳を並べて見比べられる",
				text: `完璧な翻訳は存在しません｡原文を確認しなければならないときがあります｡
Evameでは、上にスクロールすると出てくるフローティングコントローラーを使えば、必要なときに表示をすぐ切り替えて見比べられます。`,
			},
			{
				header: "継続的な翻訳の改善",
				text: `自動翻訳の精度には限界があり、改善の余地が放置されがちです。
Evameでは、ユーザーの投票や提案によって翻訳が日々改善されます。試しにこの訳文をクリックしてみてください｡
投票や追加のフォームが現れるはずです｡
あなたの文章の翻訳に対するフィードバックも世界中から得られ、継続的に改善できます。`,
			},
		],
	},
	en: {
		heroHeader: "Global Community for Creators",
		heroText: `"Evame" is a multilingual community where creators can share their work with the world and gain global users.
You can post explanations of your work, daily events, share projects you're working on, and interact with creators from all over the world.
Let's overcome language barriers and achieve global recognition and interaction simultaneously.`,
		ourProblemHeader: "Language barriers are locking away your potential.",
		sections: [
			{
				header: "Reach the World Automatically",
				text: `No matter how excellent your work is, it won't reach more than half the world if it's only in one language.
With Evame, your posts are automatically translated into multiple languages by AI, allowing your ideas to naturally spread across the globe.`,
			},
			{
				header: "Your Passion Inspires Support",
				text: `When the passion and challenges behind your work are conveyed, it's no longer just a post but a story that attracts support.
With Evame, these sentiments reach the world, naturally expanding the circle of support and collaboration.`,
			},
			{
				header: "A Global Community",
				text: `Language differences make cross-border technical dialogue and collaboration difficult.
With Evame, articles and comments are automatically translated, creating an environment where you can share ideas and collaborate in real-time with creators from around the world.`,
			},
			{
				header: "An Editor That Lets You Focus on Writing",
				text: `Are translations, formatting, or difficult-to-use input screens hindering your creation?
Evame provides a comfortable Markdown-enabled editor for both PC and mobile. Just write naturally, and AI will automatically handle the translation so you can focus on writing.`,
			},
			{
				header: "Compare Original and Translation Easily",
				text: `No translation is perfect. There are times when you need to review the original text.
With Evame, you can use the floating controller that appears when you scroll up to quickly switch views and compare whenever necessary.`,
			},
			{
				header: "Translations That Improve Daily",
				text: `The accuracy of machine translation has its limits, and the potential for improvement is often neglected.
With Evame, translations are improved daily through user votes and suggestions. Try clicking on this translated text—forms for voting or adding suggestions will appear.
You can also receive feedback from around the world on translations of your own writing and keep improving them.`,
			},
		],
	},
	zh: {
		heroHeader: "面向创作者的全球社区",
		heroText: `“Evame” 是一个多语言社区，创作者可以在这里向世界展示他们的作品并获得全球用户。
你可以发布作品解说、日常动态，分享正在进行的项目，并与世界各地的创作者互动。
让我们一起跨越语言障碍，同时实现全球知名度和交流。`,
		ourProblemHeader: "语言障碍正在束缚你的潜能。",
		sections: [
			{
				header: "自动拓展到全世界",
				text: `无论你的作品多么出色，如果只有一种语言，就无法触及世界的一半以上。
在 Evame，借助 AI，你的帖子将自动翻译成多种语言，你的创意将自然地传播到全球。`,
			},
			{
				header: "热情激发支持",
				text: `当作品背后的热情与挑战被传达时，它不再只是一个帖子，而是一段吸引支持的故事。
借助 Evame，这种热情将传遍世界，自然而然地扩大支持和合作的圈子。`,
			},
			{
				header: "全球社区",
				text: `语言差异使跨国技术交流和合作变得困难。
在 Evame，文章和评论都会自动翻译，让你能够与全球创作者实时分享想法、展开合作。`,
			},
			{
				header: "专注写作的编辑器",
				text: `翻译、排版或难用的编辑界面是否阻碍了你的创作？
Evame 提供兼容 Markdown 的舒适编辑器，无论在 PC 还是移动设备上都能自然写作，AI 会自动处理翻译，让你专注于写作。`,
			},
			{
				header: "轻松对照原文与译文",
				text: `没有完美的翻译。有时候你需要查看原文。
在 Evame，只需向上滚动即可调出浮动控制器，快速切换视图，方便随时对比。`,
			},
			{
				header: "持续改进的翻译质量",
				text: `机器翻译的准确度有限，改进的机会常常被忽视。
在 Evame，通过用户投票和建议，翻译每天都在改进。试着点击这段译文，你会看到投票或补充建议的表单。
你也可以从世界各地获得对你文章译文的反馈，并持续改进。`,
			},
		],
	},
	ko: {
		heroHeader: "크리에이터를 위한 글로벌 커뮤니티",
		heroText: `"Evame"은 크리에이터가 작품을 세계에 알리고 글로벌 유저를 확보할 수 있는 다국어 커뮤니티입니다.
작품 해설이나 일상 이야기를 공유하고, 진행 중인 프로젝트를 나누며 전 세계의 크리에이터와 교류할 수 있습니다.
언어 장벽에 구애받지 말고, 글로벌 인지도 상승과 교류를 동시에 이루어 보세요.`,
		ourProblemHeader: "언어 장벽이 당신의 가능성을 가두고 있습니다.",
		sections: [
			{
				header: "자동으로 세계에 확장",
				text: `작품이 아무리 뛰어나도 하나의 언어만으로는 세계의 절반 이상에 닿기 어렵습니다.
Evame에서는 AI가 게시물을 자동으로 여러 언어로 번역해 주어, 당신의 아이디어가 자연스럽게 전 세계로 퍼져 나갑니다.`,
			},
			{
				header: "열정이 후원을 이끕니다",
				text: `작품에 담긴 열정과 도전이 전달되면, 그것은 단순한 게시물이 아니라 후원을 부르는 이야기로 바뀝니다.
Evame을 통해 이러한 마음이 전 세계에 닿아 자연스럽게 응원과 협력의 폭이 넓어집니다.`,
			},
			{
				header: "글로벌 커뮤니티",
				text: `언어의 차이는 국경을 넘는 기술 대화와 협업을 어렵게 만듭니다.
Evame에서는 글과 댓글이 자동으로 번역되어 전 세계 크리에이터와 실시간으로 아이디어를 공유하고 협업할 수 있는 환경이 조성됩니다.`,
			},
			{
				header: "글쓰기에 집중할 수 있는 에디터",
				text: `번역, 서식, 사용하기 어려운 입력 화면 때문에 창작이 방해되고 있지 않나요?
Evame은 PC와 모바일 모두에서 편안하게 사용할 수 있는 Markdown 지원 에디터를 제공하며, 자연스럽게 글만 쓰면 AI가 번역을 자동으로 처리해 줍니다.`,
			},
			{
				header: "원문과 번역을 쉽게 비교",
				text: `완벽한 번역은 없습니다. 원문을 확인해야 하는 순간이 있습니다.
Evame에서는 화면을 위로 스크롤하면 나타나는 플로팅 컨트롤러로 손쉽게 뷰를 전환해 언제든 비교할 수 있습니다.`,
			},
			{
				header: "지속적으로 개선되는 번역 품질",
				text: `자동 번역의 정확도에는 한계가 있으며 개선의 여지가 방치되기 쉽습니다.
Evame에서는 사용자 투표나 제안을 통해 번역이 날마다 개선됩니다. 이 번역문을 클릭해 보세요. 투표나 의견을 추가할 수 있는 양식이 나타납니다.
당신의 글 번역에 대해서도 전 세계에서 피드백을 받아 지속적으로 개선할 수 있습니다.`,
			},
		],
	},
	es: {
		heroHeader: "Comunidad global para creadores",
		heroText: `"Evame" es una comunidad multilingüe donde los creadores pueden difundir su trabajo al mundo y ganar usuarios globales.
Puedes publicar explicaciones de tus obras, eventos diarios, compartir los proyectos en los que trabajas e interactuar con creadores de todo el mundo.
Superemos las barreras del idioma y logremos reconocimiento e interacción global al mismo tiempo.`,
		ourProblemHeader: "Las barreras del idioma están encerrando tu potencial.",
		sections: [
			{
				header: "Llega al mundo automáticamente",
				text: `Por excelente que sea tu obra, si solo está en un idioma, no llegará a más de la mitad del mundo.
Con Evame, tus publicaciones se traducen automáticamente a varios idiomas mediante IA, permitiendo que tus ideas se difundan de forma natural por todo el globo.`,
			},
			{
				header: "Tu pasión inspira apoyo",
				text: `Cuando se transmiten la pasión y los desafíos detrás de tu obra, ya no es solo una publicación, sino una historia que atrae apoyo.
Con Evame, esos sentimientos llegan al mundo, ampliando naturalmente el círculo de apoyo y colaboración.`,
			},
			{
				header: "Una comunidad global",
				text: `Las diferencias idiomáticas dificultan el diálogo técnico y la colaboración transfronteriza.
En Evame, tanto los artículos como los comentarios se traducen automáticamente, creando un entorno donde puedes compartir ideas y colaborar en tiempo real con creadores de todo el mundo.`,
			},
			{
				header: "Un editor que te permite concentrarte en escribir",
				text: `¿Las traducciones, el formato o las pantallas de entrada difíciles de usar están obstaculizando tu creación?
Evame ofrece un editor cómodo compatible con Markdown para PC y dispositivos móviles. Simplemente escribe de forma natural y la IA se encargará automáticamente de la traducción, permitiéndote concentrarte en escribir.`,
			},
			{
				header: "Compara fácilmente original y traducción",
				text: `Ninguna traducción es perfecta. Hay momentos en los que necesitas revisar el texto original.
En Evame, puedes usar el controlador flotante que aparece al desplazarte hacia arriba para cambiar rápidamente las vistas y comparar cuando sea necesario.`,
			},
			{
				header: "Traducción en mejora constante",
				text: `La precisión de la traducción automática tiene sus límites, y a menudo se descuida el margen de mejora.
En Evame, las traducciones se mejoran a diario mediante los votos y sugerencias de los usuarios. Intenta hacer clic en este texto traducido: aparecerá un formulario para votar o añadir sugerencias.
También puedes recibir comentarios sobre la traducción de tus textos de todo el mundo y mejorarlas continuamente.`,
			},
		],
	},
};

export const ORDERED_LOCALES = ["en", "ja", "zh", "ko", "es"] as const;
