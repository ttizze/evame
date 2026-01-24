export interface LocaleContent {
	heroHeader: string;
	heroText: string;
	sections: Array<{ header: string; text: string }>;
}

export const LOCALE_CONTENT: Record<string, LocaleContent> = {
	ja: {
		heroHeader: "書く人がいて、読む人がいる。言葉が違っても。",
		heroText:
			"Evameは、あなたの記事を世界に届ける多言語ブログです。書けば自動で翻訳され、あらゆる国で読者が見つかります。",
		sections: [
			{
				header: "なぜEvameを作ったか",
				text: `僕はエンジニアで、ヴィパッサナー瞑想を実践している。2500年前にブッダが発見した瞑想法だ。

これは宗教ではなく、心を観察する技術だ。やってみると、当たり前だと思っていた世界が全く違って見える。

瞑想を続けていると、もっと深く知りたくなる。ブッダは何を説いたのか。原典を読みたくなる。

けれど日本語の完訳は戦前のものしかない。自分の言語で読みたいのに、読めない。一人で全部翻訳するのも無理がある。AIの翻訳も信用できるかわからない。

だから、自動で翻訳して、読者の投票で訳を磨ける仕組みを作った。でもこれは仏典に限った問題じゃない。僕が知識を求めたように、どこかで誰かが何かを探している。届くのを待っている知識や物語もある。

それが言葉の壁を越えて届くよう、誰でも投稿できる多言語ブログサービスにした。`,
			},
			{
				header: "書くだけ、翻訳は自動",
				text: `あなたは自分の言葉で書くだけ。記事を公開すると、自動で複数の言語に翻訳されます。

翻訳の手間も、外国語の知識も必要ありません。書くことだけに集中できます。`,
			},
			{
				header: "読者が投票で翻訳を磨く",
				text: `自動翻訳は完璧ではありません。でも、読者が投票で良い訳を選べます。

みんなの目で翻訳が磨かれていく。時間が経つほど、訳の質が上がっていきます。`,
			},
			{
				header: "原文と訳文を並べて読める",
				text: `翻訳だけでは不安なとき、原文をすぐ確認できます。

上下に並べて表示。ワンタップで切り替え。読み比べながら、正確に理解できます。`,
			},
		],
	},
	en: {
		heroHeader:
			"Writers and readers. Even when they speak different languages.",
		heroText:
			"Evame is a multilingual blog that delivers your articles to the world. Write once, get auto-translated, and find readers in any country.",
		sections: [
			{
				header: "Why I Built Evame",
				text: `I'm an engineer who practices Vipassana meditation—a method discovered by the Buddha 2,500 years ago.

This isn't religion. It's a technique for observing the mind. When you try it, the world you took for granted starts to look completely different.

The more I meditated, the more I wanted to understand. What did the Buddha actually teach? I wanted to read the original texts.

But the only complete Japanese translation of the Buddhist canon dates back to before World War II. I wanted to read it in my own language, but I couldn't. And translating everything myself wasn't realistic. I wasn't sure if I could trust AI translation either.

So I built a system that auto-translates first, then lets readers vote to refine the translations. But this isn't just about Buddhist texts. Just as I sought knowledge, somewhere out there, someone is searching for something. There's also knowledge and stories waiting to reach people.

I made it a multilingual blog where anyone can post, so that they can cross language barriers.`,
			},
			{
				header: "Just Write, Translation is Automatic",
				text: `You just write in your own language. When you publish, your article is automatically translated into multiple languages.

No translation work. No foreign language skills needed. Just focus on writing.`,
			},
			{
				header: "Readers Refine Translations by Voting",
				text: `Auto-translation isn't perfect. But readers can vote for better translations.

Translations get refined by many eyes. The quality improves over time.`,
			},
			{
				header: "Read Original and Translation Side by Side",
				text: `When translation alone isn't enough, you can check the original instantly.

Displayed side by side. Switch with one tap. Compare and understand accurately.`,
			},
		],
	},
	zh: {
		heroHeader: "有写的人，有读的人。即使语言不同。",
		heroText:
			"Evame 是一个将您的文章传递到世界的多语言博客。写下文章，自动翻译，在任何国家都能找到读者。",
		sections: [
			{
				header: "为什么我创建了Evame",
				text: `我是一名工程师，练习内观禅修——这是佛陀在2500年前发现的方法。

这不是宗教，而是观察心灵的技术。当你尝试时，你习以为常的世界会变得完全不同。

禅修越深入，我就越想了解更多。佛陀到底教导了什么？我想阅读原典。

但日语的佛典完整翻译只有战前的版本。我想用自己的语言阅读，却无法做到。一个人翻译所有内容也不现实。AI翻译是否可信也不确定。

所以我创建了一个系统，先自动翻译，然后让读者投票改进翻译。但这不仅仅是佛典的问题。正如我追求知识一样，世界某处也有人在寻找着什么。也有知识和故事在等待被传递。

我把它做成了任何人都可以发布的多语言博客，让它们能跨越语言的障碍。`,
			},
			{
				header: "只需写作，翻译自动完成",
				text: `你只需用自己的语言写作。发布后，文章会自动翻译成多种语言。

无需翻译工作，无需外语技能。专注于写作即可。`,
			},
			{
				header: "读者投票改进翻译",
				text: `自动翻译并不完美。但读者可以投票选择更好的翻译。

众人的眼睛让翻译不断改进。质量随时间提升。`,
			},
			{
				header: "原文与译文并排阅读",
				text: `当仅靠翻译不够时，你可以立即查看原文。

并排显示，一键切换。对比阅读，准确理解。`,
			},
		],
	},
	ko: {
		heroHeader: "쓰는 사람이 있고, 읽는 사람이 있다. 언어가 달라도.",
		heroText:
			"Evame은 당신의 글을 세계에 전하는 다국어 블로그입니다. 글을 쓰면 자동으로 번역되어 어느 나라에서든 독자를 만날 수 있습니다.",
		sections: [
			{
				header: "왜 Evame을 만들었는가",
				text: `저는 엔지니어이며, 위빠사나 명상을 수행하고 있습니다. 2500년 전 붓다가 발견한 명상법입니다.

이것은 종교가 아니라 마음을 관찰하는 기술입니다. 해보면 당연하게 여겼던 세상이 완전히 다르게 보입니다.

명상을 계속하다 보면 더 깊이 알고 싶어집니다. 붓다는 무엇을 가르쳤는가? 원전을 읽고 싶어집니다.

하지만 일본어 불전의 완역은 전쟁 전의 것밖에 없습니다. 내 언어로 읽고 싶은데 읽을 수 없습니다. 혼자서 모든 것을 번역하는 것도 현실적이지 않습니다. AI 번역을 믿을 수 있을지도 확신할 수 없었습니다.

그래서 먼저 자동으로 번역하고, 독자 투표로 번역을 다듬을 수 있는 시스템을 만들었습니다. 하지만 이것은 불전만의 문제가 아닙니다. 제가 지식을 찾았듯이, 어딘가에서 누군가가 무언가를 찾고 있습니다. 전해지기를 기다리는 지식과 이야기도 있습니다.

그것이 언어의 장벽을 넘어 전해질 수 있도록 누구나 글을 올릴 수 있는 다국어 블로그 서비스로 만들었습니다.`,
			},
			{
				header: "글만 쓰면, 번역은 자동",
				text: `당신은 자신의 언어로 글만 쓰면 됩니다. 게시하면 자동으로 여러 언어로 번역됩니다.

번역 작업도, 외국어 실력도 필요 없습니다. 글쓰기에만 집중하세요.`,
			},
			{
				header: "독자가 투표로 번역을 다듬다",
				text: `자동 번역은 완벽하지 않습니다. 하지만 독자가 더 나은 번역에 투표할 수 있습니다.

많은 눈으로 번역이 다듬어집니다. 시간이 지날수록 품질이 향상됩니다.`,
			},
			{
				header: "원문과 번역을 나란히 읽기",
				text: `번역만으로는 부족할 때, 원문을 즉시 확인할 수 있습니다.

나란히 표시. 한 번의 탭으로 전환. 비교하며 정확하게 이해하세요.`,
			},
		],
	},
	es: {
		heroHeader:
			"Hay quien escribe y hay quien lee. Aunque hablen idiomas distintos.",
		heroText:
			"Evame es un blog multilingüe que lleva tus artículos al mundo. Escribe, se traduce automáticamente y encuentra lectores en cualquier país.",
		sections: [
			{
				header: "Por qué creé Evame",
				text: `Soy ingeniero y practico la meditación Vipassana, un método descubierto por Buda hace 2500 años.

Esto no es religión. Es una técnica para observar la mente. Cuando lo pruebas, el mundo que dabas por sentado empieza a verse completamente diferente.

Cuanto más meditaba, más quería entender. ¿Qué enseñó realmente Buda? Quería leer los textos originales.

Pero la única traducción completa al japonés del canon budista es de antes de la Segunda Guerra Mundial. Quería leerlo en mi propio idioma, pero no podía. Y traducirlo todo yo solo no era realista. Tampoco estaba seguro de poder confiar en la traducción de IA.

Así que construí un sistema que primero traduce automáticamente y luego permite a los lectores votar para mejorar las traducciones. Pero esto no es solo un problema de textos budistas. Así como yo busqué conocimiento, en algún lugar alguien está buscando algo. También hay conocimiento e historias esperando ser transmitidos.

Lo convertí en un blog multilingüe donde cualquiera puede publicar, para que puedan cruzar las barreras del idioma.`,
			},
			{
				header: "Solo escribe, la traducción es automática",
				text: `Solo escribe en tu propio idioma. Cuando publicas, tu artículo se traduce automáticamente a varios idiomas.

Sin trabajo de traducción. Sin necesidad de idiomas extranjeros. Solo concéntrate en escribir.`,
			},
			{
				header: "Los lectores mejoran las traducciones votando",
				text: `La traducción automática no es perfecta. Pero los lectores pueden votar por mejores traducciones.

Las traducciones se refinan con muchos ojos. La calidad mejora con el tiempo.`,
			},
			{
				header: "Lee original y traducción lado a lado",
				text: `Cuando la traducción sola no es suficiente, puedes ver el original al instante.

Mostrados lado a lado. Cambia con un toque. Compara y entiende con precisión.`,
			},
		],
	},
};
