export interface LocaleContent {
	sections: Array<{ id: string; text: string }>;
}

export const LOCALE_CONTENT: Record<string, LocaleContent> = {
	ja: {
		sections: [
			// Hero Section
			{
				id: "heroHeader",
				text: "いつもの言葉で書く。\n世界中の読者が読む。",
			},
			{
				id: "heroDetail",
				text: "日本語で書くだけで、英語・中国語・スペイン語を含む\n18言語に自動翻訳",
			},
			// Social Proof Bar
			{ id: "socialProofArticles", text: "記事" },
			{ id: "socialProofTranslations", text: "翻訳" },
			{ id: "socialProofLanguages", text: "対応言語" },
			// Founder Story Section
			{ id: "founderStoryHeader", text: "なぜ作ったのか" },
			{ id: "founderStoryText1", text: "言葉の壁にぶつかった。" },
			{
				id: "founderStoryText2",
				text: "読みたいものがあった。ブッダの言葉。でも読みやすい日本語訳が見つからなかった。\n自分のサービスを世界に届けたかった。でも翻訳する時間はなかった。",
			},
			{
				id: "founderStoryText3",
				text: "だから作った。言葉の壁がないインターネットを。",
			},
			{ id: "founderStoryText4", text: "あなたにも届けたい言葉があるはずだ。" },
			// Problem Section
			{ id: "problemHeader", text: "こんなこと、ありませんか?" },
			{
				id: "problemText1",
				text: "せっかく書いた記事が、日本語圏だけで終わる。",
			},
			{
				id: "problemText2",
				text: "英語や中国語で書けば届くのはわかってる。でも、時間がない。",
			},
			{
				id: "problemText3",
				text: "翻訳じゃなくて、書くことに時間を使いたい。",
			},
			// BentoGrid Features Section
			{ id: "writeHeader", text: "書く" },
			{
				id: "writeText",
				text: "翻訳のことは考えなくていい。いつもの言葉で、いつものように書くだけ。",
			},
			{ id: "reachHeader", text: "届く" },
			{
				id: "reachText",
				text: "公開した瞬間、18言語に自動翻訳。日本語で書くだけで、世界中の読者があなたの記事を読める。",
			},
			{ id: "refineHeader", text: "磨く" },
			{
				id: "refineText",
				text: "AI翻訳のままじゃない。読者が「この訳がいい」と投票。Wikipediaのように、みんなで良くしていく翻訳。",
			},
			{ id: "readHeader", text: "読む" },
			{
				id: "readText",
				text: "原文と翻訳を並べて読める。「この訳、ちょっと違う」と思ったら、原文を確認。語学学習にも。",
			},
			// Comparison Section
			{ id: "comparisonHeader", text: "Medium や note との違い" },
			{ id: "comparisonCol1", text: "Evame" },
			{ id: "comparisonCol2", text: "Medium/note" },
			{ id: "comparisonRow1Label", text: "届く読者の数" },
			{ id: "comparisonRow1Evame", text: "世界中（18言語）" },
			{ id: "comparisonRow1Others", text: "1言語圏のみ" },
			{ id: "comparisonRow2Label", text: "翻訳品質" },
			{ id: "comparisonRow2Evame", text: "読者の投票で改善" },
			{ id: "comparisonRow2Others", text: "-" },
			{ id: "comparisonRow3Label", text: "原文・訳文の表示" },
			{ id: "comparisonRow3Evame", text: "並列表示に対応" },
			{ id: "comparisonRow3Others", text: "単一言語のみ" },
			{ id: "comparisonRow4Label", text: "無料プラン" },
			{ id: "comparisonRow4Evame", text: "2言語まで無料" },
			{ id: "comparisonRow4Others", text: "無料" },
			// FAQ Section
			{ id: "faqHeader", text: "よくある質問" },
			{ id: "faq1Question", text: "無料で使えますか?" },
			{
				id: "faq1Answer",
				text: "はい、無料プランで2言語まで利用できます。18言語すべてを使いたい場合は、有料プランをご検討ください。",
			},
			{ id: "faq2Question", text: "翻訳の精度は?" },
			{
				id: "faq2Answer",
				text: "機械翻訳をベースに、読者の投票で品質が向上します。よく読まれる記事ほど、翻訳の質が高まっていきます。",
			},
			{ id: "faq3Question", text: "どんな言語に対応していますか?" },
			{
				id: "faq3Answer",
				text: "日本語、英語、中国語、スペイン語など、18言語に対応しています。",
			},
			{
				id: "faq4Question",
				text: "翻訳されたブログは、検索エンジンに表示されますか?",
			},
			{
				id: "faq4Answer",
				text: "はい、各言語ごとに独立したURLが生成され、検索エンジンに最適化されています。世界中の読者があなたの記事を見つけられます。",
			},
			{ id: "faq5Question", text: "記事の所有権は?" },
			{
				id: "faq5Answer",
				text: "記事はあなたのものです。いつでもエクスポートできます。",
			},
			// Final CTA Section
			{ id: "finalCTAHeader", text: "あなたの言葉を、世界に届けよう。" },
		],
	},
	en: {
		sections: [
			// Hero Section
			{
				id: "heroHeader",
				text: "Write in your language.\nReaders around the world will read.",
			},
			{
				id: "heroDetail",
				text: "Publish in English, and it's automatically translated into 18 languages, including Japanese, Chinese, and Spanish.",
			},
			// Social Proof Bar
			{ id: "socialProofArticles", text: "articles" },
			{ id: "socialProofTranslations", text: "translations" },
			{ id: "socialProofLanguages", text: "languages" },
			// Founder Story Section
			{ id: "founderStoryHeader", text: "Why I built this" },
			{ id: "founderStoryText1", text: "I hit a language wall." },
			{
				id: "founderStoryText2",
				text: "I wanted to read something. The words of the Buddha. But I couldn't find a readable Japanese translation.\nI wanted to share my service with the world. But I had no time to translate.",
			},
			{
				id: "founderStoryText3",
				text: "So I built it. An internet without language walls.",
			},
			{ id: "founderStoryText4", text: "You have words to share, too." },
			// Problem Section
			{ id: "problemHeader", text: "Sound familiar?" },
			{
				id: "problemText1",
				text: "You write in English. That reaches only the English-speaking world.",
			},
			{
				id: "problemText2",
				text: "You know Chinese and Spanish would help. But learning them? Writing in them? No time for that.",
			},
			{
				id: "problemText3",
				text: "You want to spend time writing. Not learning languages.",
			},
			// BentoGrid Features Section
			{ id: "writeHeader", text: "Write" },
			{
				id: "writeText",
				text: "Don't think about translation. Just write in your language, the way you always do.",
			},
			{ id: "reachHeader", text: "Reach" },
			{
				id: "reachText",
				text: "Published instantly in 18 languages. Write once in English. Reach beyond the English-speaking world.",
			},
			{ id: "refineHeader", text: "Refine" },
			{
				id: "refineText",
				text: "Not just machine translation. Readers vote for better translations. Like Wikipedia, the community improves quality together.",
			},
			{ id: "readHeader", text: "Read" },
			{
				id: "readText",
				text: "View original and translation side-by-side. If something feels off, check the original. Perfect for learning.",
			},
			// Comparison Section
			{
				id: "comparisonHeader",
				text: "How is this different from Medium or note?",
			},
			{ id: "comparisonCol1", text: "Evame" },
			{ id: "comparisonCol2", text: "Medium/note" },
			{ id: "comparisonRow1Label", text: "Audience reach" },
			{ id: "comparisonRow1Evame", text: "Global (18 languages)" },
			{ id: "comparisonRow1Others", text: "Single-language audience" },
			{ id: "comparisonRow2Label", text: "Quality" },
			{ id: "comparisonRow2Evame", text: "Reader votes improve translations" },
			{ id: "comparisonRow2Others", text: "-" },
			{ id: "comparisonRow3Label", text: "Display" },
			{
				id: "comparisonRow3Evame",
				text: "Side-by-side original and translation",
			},
			{ id: "comparisonRow3Others", text: "Single language only" },
			{ id: "comparisonRow4Label", text: "Free Plan" },
			{ id: "comparisonRow4Evame", text: "Free for 2 languages" },
			{ id: "comparisonRow4Others", text: "Free" },
			// FAQ Section
			{ id: "faqHeader", text: "Frequently Asked Questions" },
			{ id: "faq1Question", text: "Is it free?" },
			{
				id: "faq1Answer",
				text: "Yes, the free plan supports 2 languages. For all 18 languages, consider our paid plan.",
			},
			{ id: "faq2Question", text: "How accurate is the translation?" },
			{
				id: "faq2Answer",
				text: "It starts with machine translation, then readers vote to improve quality. The more readers, the better the translation becomes.",
			},
			{ id: "faq3Question", text: "What languages are supported?" },
			{
				id: "faq3Answer",
				text: "English, Japanese, Chinese, Spanish, and 14 more — 18 languages total.",
			},
			{
				id: "faq4Question",
				text: "Will my translated blog appear in search engines?",
			},
			{
				id: "faq4Answer",
				text: "Yes, each language gets its own URL optimized for search engines. Readers worldwide can discover your articles.",
			},
			{ id: "faq5Question", text: "Who owns my content?" },
			{
				id: "faq5Answer",
				text: "You do. You can export your articles anytime.",
			},
			// Final CTA Section
			{ id: "finalCTAHeader", text: "Share your words with the world." },
		],
	},
	es: {
		sections: [
			// Hero Section
			{
				id: "heroHeader",
				text: "Escribe en tu idioma.\nLectores de todo el mundo leerán.",
			},
			{
				id: "heroDetail",
				text: "Publica en español y se traduce automáticamente a 18 idiomas, incluidos inglés, japonés y chino.",
			},
			// Social Proof Bar
			{ id: "socialProofArticles", text: "artículos" },
			{ id: "socialProofTranslations", text: "traducciones" },
			{ id: "socialProofLanguages", text: "idiomas" },
			// Founder Story Section
			{ id: "founderStoryHeader", text: "Por qué lo creé" },
			{ id: "founderStoryText1", text: "Me topé con una barrera lingüística." },
			{
				id: "founderStoryText2",
				text: "Quería leer algo. Las palabras del Buda. Pero no encontré una traducción japonesa fácil de leer.\nQuería compartir mi servicio con el mundo. Pero no tenía tiempo para traducir.",
			},
			{
				id: "founderStoryText3",
				text: "Así que lo construí. Un internet sin barreras de idioma.",
			},
			{
				id: "founderStoryText4",
				text: "Tú también tienes palabras que compartir.",
			},
			// Problem Section
			{ id: "problemHeader", text: "¿Te suena familiar?" },
			{
				id: "problemText1",
				text: "Escribes en español. Eso llega solo al mundo hispanohablante.",
			},
			{
				id: "problemText2",
				text: "Sabes que el inglés y el chino ayudarían. Pero ¿aprenderlos? ¿Escribir en ellos? No hay tiempo.",
			},
			{
				id: "problemText3",
				text: "Quieres dedicar tiempo a escribir. No a aprender idiomas.",
			},
			// BentoGrid Features Section
			{ id: "writeHeader", text: "Escribir" },
			{
				id: "writeText",
				text: "No pienses en la traducción. Solo escribe en tu idioma, como siempre.",
			},
			{ id: "reachHeader", text: "Llegar" },
			{
				id: "reachText",
				text: "Publicado al instante en 18 idiomas. Escribe una vez en español. Llega a miles de millones.",
			},
			{ id: "refineHeader", text: "Mejorar" },
			{
				id: "refineText",
				text: "No es solo traducción automática. Los lectores votan por mejores traducciones. Como Wikipedia, la comunidad mejora la calidad.",
			},
			{ id: "readHeader", text: "Leer" },
			{
				id: "readText",
				text: "Mira el original y la traducción lado a lado. Si algo no cuadra, revisa el original. Perfecto para aprender.",
			},
			// Comparison Section
			{
				id: "comparisonHeader",
				text: "¿En qué es diferente de Medium o note?",
			},
			{ id: "comparisonCol1", text: "Evame" },
			{ id: "comparisonCol2", text: "Medium/note" },
			{ id: "comparisonRow1Label", text: "Alcance de lectores" },
			{ id: "comparisonRow1Evame", text: "Global (18 idiomas)" },
			{ id: "comparisonRow1Others", text: "Audiencia de un solo idioma" },
			{ id: "comparisonRow2Label", text: "Calidad" },
			{
				id: "comparisonRow2Evame",
				text: "Los votos de lectores mejoran las traducciones",
			},
			{ id: "comparisonRow2Others", text: "-" },
			{ id: "comparisonRow3Label", text: "Visualización" },
			{
				id: "comparisonRow3Evame",
				text: "Original y traducción en paralelo",
			},
			{ id: "comparisonRow3Others", text: "Solo un idioma" },
			{ id: "comparisonRow4Label", text: "Plan gratuito" },
			{ id: "comparisonRow4Evame", text: "Gratis para 2 idiomas" },
			{ id: "comparisonRow4Others", text: "Gratis" },
			// FAQ Section
			{ id: "faqHeader", text: "Preguntas frecuentes" },
			{ id: "faq1Question", text: "¿Es gratis?" },
			{
				id: "faq1Answer",
				text: "Sí, el plan gratuito permite 2 idiomas. Para los 18 idiomas, considera nuestro plan de pago.",
			},
			{ id: "faq2Question", text: "¿Qué tan precisa es la traducción?" },
			{
				id: "faq2Answer",
				text: "Comienza con traducción automática y luego los lectores votan para mejorar la calidad. Cuantos más lectores, mejor la traducción.",
			},
			{ id: "faq3Question", text: "¿Qué idiomas están disponibles?" },
			{
				id: "faq3Answer",
				text: "Español, inglés, japonés, chino y 14 más — 18 idiomas en total.",
			},
			{
				id: "faq4Question",
				text: "¿Mi blog traducido aparecerá en buscadores?",
			},
			{
				id: "faq4Answer",
				text: "Sí, cada idioma tiene su propia URL optimizada para buscadores. Lectores de todo el mundo pueden descubrir tus artículos.",
			},
			{ id: "faq5Question", text: "¿Quién es dueño de mi contenido?" },
			{
				id: "faq5Answer",
				text: "Tú. Puedes exportar tus artículos en cualquier momento.",
			},
			// Final CTA Section
			{ id: "finalCTAHeader", text: "Comparte tus palabras con el mundo." },
		],
	},
	ko: {
		sections: [
			// Hero Section
			{
				id: "heroHeader",
				text: "내 언어로 쓴다.\n전 세계 독자가 읽는다.",
			},
			{
				id: "heroDetail",
				text: "한국어로 공개하면 영어·일본어·중국어 등 18개 언어로 자동 번역됩니다.",
			},
			// Social Proof Bar
			{ id: "socialProofArticles", text: "개의 글" },
			{ id: "socialProofTranslations", text: "건의 번역" },
			{ id: "socialProofLanguages", text: "개 언어" },
			// Founder Story Section
			{ id: "founderStoryHeader", text: "왜 만들었는가" },
			{ id: "founderStoryText1", text: "언어의 벽에 부딪혔다." },
			{
				id: "founderStoryText2",
				text: "읽고 싶은 것이 있었다. 붓다의 말. 하지만 읽기 쉬운 일본어 번역을 찾을 수 없었다.\n내 서비스를 세계에 알리고 싶었다. 하지만 번역할 시간이 없었다.",
			},
			{
				id: "founderStoryText3",
				text: "그래서 만들었다. 언어 장벽 없는 인터넷을.",
			},
			{ id: "founderStoryText4", text: "당신도 전하고 싶은 말이 있을 것이다." },
			// Problem Section
			{ id: "problemHeader", text: "익숙한가요?" },
			{
				id: "problemText1",
				text: "한국어로 쓴다. 닿는 곳은 한국어권뿐이다.",
			},
			{
				id: "problemText2",
				text: "영어와 중국어가 도움이 된다는 건 안다. 하지만 배우고 쓰기엔 시간이 없다.",
			},
			{
				id: "problemText3",
				text: "번역이 아니라 글쓰기에 시간을 쓰고 싶다.",
			},
			// BentoGrid Features Section
			{ id: "writeHeader", text: "쓰기" },
			{
				id: "writeText",
				text: "번역은 신경 쓰지 마세요. 평소처럼 내 언어로 쓰기만 하면 됩니다.",
			},
			{ id: "reachHeader", text: "도달" },
			{
				id: "reachText",
				text: "공개 즉시 18개 언어로 번역. 한국어로 한 번만 써도, 전 세계 독자에게 닿습니다.",
			},
			{ id: "refineHeader", text: "다듬기" },
			{
				id: "refineText",
				text: "기계 번역만이 아닙니다. 독자가 더 나은 번역에 투표합니다. 위키피디아처럼, 함께 품질을 높입니다.",
			},
			{ id: "readHeader", text: "읽기" },
			{
				id: "readText",
				text: "원문과 번역을 나란히 볼 수 있습니다. 어색하다고 느끼면 원문을 확인하세요. 학습에도 좋습니다.",
			},
			// Comparison Section
			{ id: "comparisonHeader", text: "Medium나 note와 무엇이 다른가요?" },
			{ id: "comparisonCol1", text: "Evame" },
			{ id: "comparisonCol2", text: "Medium/note" },
			{ id: "comparisonRow1Label", text: "도달 독자 수" },
			{ id: "comparisonRow1Evame", text: "전 세계(18개 언어)" },
			{ id: "comparisonRow1Others", text: "단일 언어권" },
			{ id: "comparisonRow2Label", text: "번역 품질" },
			{ id: "comparisonRow2Evame", text: "독자 투표로 개선" },
			{ id: "comparisonRow2Others", text: "-" },
			{ id: "comparisonRow3Label", text: "원문·번역 표시" },
			{ id: "comparisonRow3Evame", text: "나란히 보기 지원" },
			{ id: "comparisonRow3Others", text: "단일 언어만" },
			{ id: "comparisonRow4Label", text: "무료 플랜" },
			{ id: "comparisonRow4Evame", text: "2개 언어까지 무료" },
			{ id: "comparisonRow4Others", text: "무료" },
			// FAQ Section
			{ id: "faqHeader", text: "자주 묻는 질문" },
			{ id: "faq1Question", text: "무료로 쓸 수 있나요?" },
			{
				id: "faq1Answer",
				text: "네, 무료 플랜은 2개 언어까지 지원합니다. 18개 언어 전체가 필요하다면 유료 플랜을 고려해 주세요.",
			},
			{ id: "faq2Question", text: "번역 정확도는 어떤가요?" },
			{
				id: "faq2Answer",
				text: "기계 번역으로 시작하고, 독자 투표로 품질이 개선됩니다. 읽는 사람이 많을수록 번역 품질이 높아집니다.",
			},
			{ id: "faq3Question", text: "어떤 언어를 지원하나요?" },
			{
				id: "faq3Answer",
				text: "한국어, 영어, 일본어, 중국어 등 18개 언어를 지원합니다.",
			},
			{
				id: "faq4Question",
				text: "번역된 블로그가 검색엔진에 표시되나요?",
			},
			{
				id: "faq4Answer",
				text: "네, 각 언어마다 독립 URL이 생성되어 검색엔진에 최적화됩니다. 전 세계 독자가 글을 찾을 수 있습니다.",
			},
			{ id: "faq5Question", text: "콘텐츠 소유권은 누구에게 있나요?" },
			{
				id: "faq5Answer",
				text: "당신입니다. 언제든지 내보낼 수 있습니다.",
			},
			// Final CTA Section
			{ id: "finalCTAHeader", text: "당신의 말을 세계에 전하세요." },
		],
	},
	zh: {
		sections: [
			// Hero Section
			{
				id: "heroHeader",
				text: "用你的语言写作。\n全世界的读者都会读。",
			},
			{
				id: "heroDetail",
				text: "用中文发布后，会自动翻译成英语、日语、西班牙语等 18 种语言。",
			},
			// Social Proof Bar
			{ id: "socialProofArticles", text: "篇文章" },
			{ id: "socialProofTranslations", text: "条翻译" },
			{ id: "socialProofLanguages", text: "种语言" },
			// Founder Story Section
			{ id: "founderStoryHeader", text: "为什么我做这个" },
			{ id: "founderStoryText1", text: "我碰到了语言的障碍。" },
			{
				id: "founderStoryText2",
				text: "我想读些东西。佛陀的文字。但找不到易读的日语译本。\n我想把我的服务分享给世界。但我没有时间去翻译。",
			},
			{
				id: "founderStoryText3",
				text: "所以我做了它。一个没有语言壁垒的互联网。",
			},
			{ id: "founderStoryText4", text: "你也有想分享的话。" },
			// Problem Section
			{ id: "problemHeader", text: "听起来熟悉吗？" },
			{
				id: "problemText1",
				text: "你用中文写作。触达的只是中文语圈。",
			},
			{
				id: "problemText2",
				text: "你知道英语和西班牙语会更有帮助。但学习它们？用它们写？没时间。",
			},
			{
				id: "problemText3",
				text: "你想把时间花在写作上，而不是学语言。",
			},
			// BentoGrid Features Section
			{ id: "writeHeader", text: "写" },
			{
				id: "writeText",
				text: "不用考虑翻译。像平时一样用你的语言写就好。",
			},
			{ id: "reachHeader", text: "触达" },
			{
				id: "reachText",
				text: "发布后立即翻译成 18 种语言。用中文写一次，触达数十亿读者。",
			},
			{ id: "refineHeader", text: "打磨" },
			{
				id: "refineText",
				text: "不只是机器翻译。读者投票选出更好的译文。像维基百科一样，大家一起提升质量。",
			},
			{ id: "readHeader", text: "阅读" },
			{
				id: "readText",
				text: "原文和译文并排阅读。如果觉得不对，就查看原文。也很适合学习。",
			},
			// Comparison Section
			{ id: "comparisonHeader", text: "与 Medium 或 note 有何不同？" },
			{ id: "comparisonCol1", text: "Evame" },
			{ id: "comparisonCol2", text: "Medium/note" },
			{ id: "comparisonRow1Label", text: "触达读者范围" },
			{ id: "comparisonRow1Evame", text: "全球（18 种语言）" },
			{ id: "comparisonRow1Others", text: "单一语言圈" },
			{ id: "comparisonRow2Label", text: "翻译质量" },
			{ id: "comparisonRow2Evame", text: "读者投票改进" },
			{ id: "comparisonRow2Others", text: "-" },
			{ id: "comparisonRow3Label", text: "原文/译文展示" },
			{ id: "comparisonRow3Evame", text: "支持并排显示" },
			{ id: "comparisonRow3Others", text: "仅单一语言" },
			{ id: "comparisonRow4Label", text: "免费计划" },
			{ id: "comparisonRow4Evame", text: "2 种语言免费" },
			{ id: "comparisonRow4Others", text: "免费" },
			// FAQ Section
			{ id: "faqHeader", text: "常见问题" },
			{ id: "faq1Question", text: "免费吗？" },
			{
				id: "faq1Answer",
				text: "是的，免费计划支持 2 种语言。若需使用全部 18 种语言，请考虑付费计划。",
			},
			{ id: "faq2Question", text: "翻译有多准确？" },
			{
				id: "faq2Answer",
				text: "先是机器翻译，然后读者投票改进质量。读者越多，翻译质量越高。",
			},
			{ id: "faq3Question", text: "支持哪些语言？" },
			{
				id: "faq3Answer",
				text: "中文、英语、日语、西班牙语等，共 18 种语言。",
			},
			{
				id: "faq4Question",
				text: "翻译后的博客会出现在搜索引擎里吗？",
			},
			{
				id: "faq4Answer",
				text: "会的，每种语言都有独立的 URL，并针对搜索引擎优化。全球读者都能发现你的文章。",
			},
			{ id: "faq5Question", text: "内容归谁所有？" },
			{
				id: "faq5Answer",
				text: "归你所有。你可以随时导出文章。",
			},
			// Final CTA Section
			{ id: "finalCTAHeader", text: "把你的话分享给世界。" },
		],
	},
};

function assertLocaleSections(baseIds: string[], locale: string) {
	const ids = LOCALE_CONTENT[locale].sections.map((section) => section.id);
	if (ids.length !== baseIds.length) {
		throw new Error(
			`LOCALE_CONTENT.${locale} has ${ids.length} sections, expected ${baseIds.length}`,
		);
	}
	for (const id of baseIds) {
		if (!ids.includes(id)) {
			throw new Error(`LOCALE_CONTENT.${locale} missing section: ${id}`);
		}
	}
}

const SEGMENT_IDS = LOCALE_CONTENT.en.sections.map((section) => section.id);
const OTHER_LOCALES = Object.keys(LOCALE_CONTENT).filter(
	(locale) => locale !== "en",
);
for (const locale of OTHER_LOCALES) {
	assertLocaleSections(SEGMENT_IDS, locale);
}

// ID から segment number へのマッピング（配列のインデックス）
export const SEGMENT_NUMBER = Object.fromEntries(
	SEGMENT_IDS.map((id, index) => [id, index]),
) as Record<string, number>;

export type SegmentId = keyof typeof SEGMENT_NUMBER;
