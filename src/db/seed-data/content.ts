export interface LocaleContent {
	sections: Array<{ id: string; text: string }>;
}

// ID から segment number へのマッピング（配列のインデックス）
export const SEGMENT_NUMBER = {
	heroHeader: 0,
	heroText: 1,
	founderStoryHeader: 2,
	founderStoryText: 3,
	founderStoryText2: 4,
	founderStoryText3: 5,
	writeHeader: 6,
	writeText: 7,
	reachHeader: 8,
	reachText: 9,
	refineHeader: 10,
	refineText: 11,
	readHeader: 12,
	readText: 13,
	finalCTAHeader: 14,
	finalCTAText: 15,
} as const;

export type SegmentId = keyof typeof SEGMENT_NUMBER;

export const LOCALE_CONTENT: Record<string, LocaleContent> = {
	ja: {
		sections: [
			// Hero
			{ id: "heroHeader", text: "言葉の壁がないインターネット。" },
			{ id: "heroText", text: "母国語で書く。世界が読む。" },
			// Founder Story
			{ id: "founderStoryHeader", text: "なぜ作ったのか" },
			{ id: "founderStoryText", text: "読みたいものがあった。" },
			{
				id: "founderStoryText2",
				text: "ブッダの言葉。でも日本語の完訳は戦前のものしかない。言葉の壁で、読めなかった。",
			},
			{
				id: "founderStoryText3",
				text: "だから作った。言葉の壁がないインターネットを。",
			},
			// BentoGrid - 書く
			{ id: "writeHeader", text: "書く" },
			{
				id: "writeText",
				text: "母国語で書くだけ。翻訳の手間なし、書くことに集中。",
			},
			// BentoGrid - 届く
			{ id: "reachHeader", text: "届く" },
			{ id: "reachText", text: "自動で翻訳。世界の読者に届く。" },
			// BentoGrid - 磨く
			{ id: "refineHeader", text: "磨く" },
			{
				id: "refineText",
				text: "読者が投票で良い訳を選ぶ。時間が経つほど品質が上がる。",
			},
			// BentoGrid - 読む
			{ id: "readHeader", text: "読む" },
			{
				id: "readText",
				text: "原文だけ、訳だけ、両方。切り替えは自在。語学学習にも、正確な理解にも。",
			},
			// FinalCTA
			{ id: "finalCTAHeader", text: "書く人がいて、読む人がいる。" },
			{ id: "finalCTAText", text: "言葉が違っても。" },
		],
	},
	en: {
		sections: [
			// Hero
			{ id: "heroHeader", text: "An internet without language walls." },
			{ id: "heroText", text: "Write in your language. The world reads." },
			// Founder Story
			{ id: "founderStoryHeader", text: "Why I built this" },
			{ id: "founderStoryText", text: "I wanted to read something." },
			{
				id: "founderStoryText2",
				text: "The words of the Buddha. But there was no modern translation in my language. A language wall stood in my way.",
			},
			{
				id: "founderStoryText3",
				text: "So I built it. An internet without language walls.",
			},
			// BentoGrid - Write
			{ id: "writeHeader", text: "Write" },
			{
				id: "writeText",
				text: "Just write in your language. No translation work, focus on writing.",
			},
			// BentoGrid - Reach
			{ id: "reachHeader", text: "Reach" },
			{ id: "reachText", text: "Auto-translated. Reach readers worldwide." },
			// BentoGrid - Refine
			{ id: "refineHeader", text: "Refine" },
			{
				id: "refineText",
				text: "Readers vote for better translations. Quality improves over time.",
			},
			// BentoGrid - Read
			{ id: "readHeader", text: "Read" },
			{
				id: "readText",
				text: "Original only, translation only, or both. Switch freely. For learning, for precise understanding.",
			},
			// FinalCTA
			{ id: "finalCTAHeader", text: "Writers and readers." },
			{ id: "finalCTAText", text: "Even when they speak different languages." },
		],
	},
	zh: {
		sections: [
			// Hero
			{ id: "heroHeader", text: "没有语言壁垒的互联网。" },
			{ id: "heroText", text: "用母语写作。世界阅读。" },
			// Founder Story
			{ id: "founderStoryHeader", text: "为什么我创建了这个" },
			{ id: "founderStoryText", text: "我想读一些东西。" },
			{
				id: "founderStoryText2",
				text: "佛陀的话语。但我的语言没有现代翻译。语言的壁垒阻挡了我。",
			},
			{
				id: "founderStoryText3",
				text: "所以我创建了它。一个没有语言壁垒的互联网。",
			},
			// BentoGrid - 写
			{ id: "writeHeader", text: "写" },
			{ id: "writeText", text: "用母语写作即可。无需翻译工作，专注写作。" },
			// BentoGrid - 传达
			{ id: "reachHeader", text: "传达" },
			{ id: "reachText", text: "自动翻译。触达全球读者。" },
			// BentoGrid - 打磨
			{ id: "refineHeader", text: "打磨" },
			{ id: "refineText", text: "读者投票选择更好的翻译。质量随时间提升。" },
			// BentoGrid - 阅读
			{ id: "readHeader", text: "阅读" },
			{
				id: "readText",
				text: "仅原文、仅译文、或两者皆有。自由切换。适合学习，也适合精确理解。",
			},
			// FinalCTA
			{ id: "finalCTAHeader", text: "有写的人，有读的人。" },
			{ id: "finalCTAText", text: "即使语言不同。" },
		],
	},
	ko: {
		sections: [
			// Hero
			{ id: "heroHeader", text: "언어 장벽 없는 인터넷." },
			{ id: "heroText", text: "모국어로 쓴다. 세계가 읽는다." },
			// Founder Story
			{ id: "founderStoryHeader", text: "왜 만들었는가" },
			{ id: "founderStoryText", text: "읽고 싶은 것이 있었다." },
			{
				id: "founderStoryText2",
				text: "붓다의 말씀. 하지만 내 언어로 된 현대 번역이 없었다. 언어의 벽이 가로막았다.",
			},
			{
				id: "founderStoryText3",
				text: "그래서 만들었다. 언어 장벽 없는 인터넷을.",
			},
			// BentoGrid - 쓰다
			{ id: "writeHeader", text: "쓰다" },
			{
				id: "writeText",
				text: "모국어로 쓰기만 하면 된다. 번역 작업 없이, 글쓰기에 집중.",
			},
			// BentoGrid - 전달
			{ id: "reachHeader", text: "전달" },
			{ id: "reachText", text: "자동 번역. 전 세계 독자에게 도달." },
			// BentoGrid - 다듬다
			{ id: "refineHeader", text: "다듬다" },
			{
				id: "refineText",
				text: "독자가 투표로 더 나은 번역을 선택. 시간이 지날수록 품질 향상.",
			},
			// BentoGrid - 읽다
			{ id: "readHeader", text: "읽다" },
			{
				id: "readText",
				text: "원문만, 번역만, 또는 둘 다. 자유롭게 전환. 학습에도, 정확한 이해에도.",
			},
			// FinalCTA
			{ id: "finalCTAHeader", text: "쓰는 사람이 있고, 읽는 사람이 있다." },
			{ id: "finalCTAText", text: "언어가 달라도." },
		],
	},
	es: {
		sections: [
			// Hero
			{ id: "heroHeader", text: "Un internet sin barreras de idioma." },
			{ id: "heroText", text: "Escribe en tu idioma. El mundo lee." },
			// Founder Story
			{ id: "founderStoryHeader", text: "Por qué lo creé" },
			{ id: "founderStoryText", text: "Quería leer algo." },
			{
				id: "founderStoryText2",
				text: "Las palabras del Buda. Pero no había traducción moderna en mi idioma. Una barrera de idioma me bloqueaba.",
			},
			{
				id: "founderStoryText3",
				text: "Así que lo construí. Un internet sin barreras de idioma.",
			},
			// BentoGrid - Escribir
			{ id: "writeHeader", text: "Escribir" },
			{
				id: "writeText",
				text: "Solo escribe en tu idioma. Sin trabajo de traducción, enfócate en escribir.",
			},
			// BentoGrid - Alcanzar
			{ id: "reachHeader", text: "Alcanzar" },
			{
				id: "reachText",
				text: "Traducido automáticamente. Llega a lectores en todo el mundo.",
			},
			// BentoGrid - Refinar
			{ id: "refineHeader", text: "Refinar" },
			{
				id: "refineText",
				text: "Los lectores votan por mejores traducciones. La calidad mejora con el tiempo.",
			},
			// BentoGrid - Leer
			{ id: "readHeader", text: "Leer" },
			{
				id: "readText",
				text: "Solo original, solo traducción, o ambos. Cambia libremente. Para aprender, para entender con precisión.",
			},
			// FinalCTA
			{ id: "finalCTAHeader", text: "Hay quien escribe y hay quien lee." },
			{ id: "finalCTAText", text: "Aunque hablen idiomas distintos." },
		],
	},
};
