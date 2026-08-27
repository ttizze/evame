export type AboutFeature = {
	title: string;
	description: string;
};

export type AboutCopy = {
	brand: string;
	heroTitle: string;
	heroDetail: string;
	stats: readonly [string, string, string];
	founderTitle: string;
	founderParagraphs: readonly string[];
	problemTitle: string;
	problemParagraphs: readonly string[];
	features: readonly [AboutFeature, AboutFeature, AboutFeature, AboutFeature];
	comparisonTitle: string;
	comparisonColumns: readonly [string, string];
	comparisonRows: readonly [string, string, string][];
	faqTitle: string;
	faq: readonly [string, string][];
	finalTitle: string;
	explore: string;
};

const english: AboutCopy = {
	brand: "Digital Buddhism",
	heroTitle: "Read the Pāli canon together.",
	heroDetail:
		"Read Pāli source texts alongside translation candidates, compare interpretations, and help the clearest translations rise through voting.",
	stats: ["Pāli source", "translation candidates", "supported languages"],
	founderTitle: "Why this exists",
	founderParagraphs: [
		"The words of the Buddha deserve to remain readable across languages.",
		"Finding a trustworthy translation is difficult when the source, context, and competing interpretations are separated across different places.",
		"Digital Buddhism brings the Pāli source and its translations together so readers can check the text for themselves.",
	],
	problemTitle: "A shared text needs a shared process.",
	problemParagraphs: [
		"A single translation can hide the choices made by its translator.",
		"Machine translation can open a door, but it still needs careful reading and correction.",
		"Readers should be able to compare candidates and support the translation that best preserves the source.",
	],
	features: [
		{
			title: "Read",
			description:
				"Read the Pāli source and its translation side by side, passage by passage.",
		},
		{
			title: "Compare",
			description:
				"See multiple translation candidates and keep the source text in view while reading.",
		},
		{
			title: "Refine",
			description:
				"Vote for the candidate that feels most faithful and help the collection improve over time.",
		},
		{
			title: "Reach",
			description:
				"Make Buddhist texts easier to approach in the language each reader understands best.",
		},
	],
	comparisonTitle: "How this way of reading is different",
	comparisonColumns: ["Digital Buddhism", "A conventional edition"],
	comparisonRows: [
		[
			"Source text",
			"Pāli source shown with each passage",
			"Often separated from the translation",
		],
		[
			"Translations",
			"Candidates can be compared",
			"Usually one translation at a time",
		],
		[
			"Quality",
			"Readers can vote for faithful wording",
			"Corrections are difficult to share",
		],
	],
	faqTitle: "Frequently asked questions",
	faq: [
		[
			"What can I read here?",
			"Published Pāli scripture passages, with translations and commentary segments when they are available.",
		],
		[
			"How are translations selected?",
			"Translation candidates are shown together, and authenticated readers can vote for the wording they find most faithful.",
		],
		[
			"Can I read the source without a translation?",
			"Yes. Every published passage keeps its Pāli source visible, even when a translation is not available yet.",
		],
		[
			"Which languages are supported?",
			"The service keeps its global set of supported locales, including Pāli, Japanese, English, Chinese, Korean, and Spanish.",
		],
	],
	finalTitle: "Begin with the words of the Buddha.",
	explore: "Explore the scriptures",
};

const localized: Partial<Record<string, AboutCopy>> = {
	ja: {
		brand: "デジタル仏教",
		heroTitle: "パーリ語仏典を、ともに読む。",
		heroDetail:
			"パーリ語の原文と翻訳候補を並べて読み、解釈を比べ、原文に忠実な訳を投票で見つけていきます。",
		stats: ["パーリ語原文", "翻訳候補", "対応言語"],
		founderTitle: "この場所をつくる理由",
		founderParagraphs: [
			"ブッダの言葉は、言語を越えて読み継がれる価値があります。",
			"信頼できる訳を探すとき、原文や文脈、異なる解釈が別々の場所にあると、読み手が確かめるのは簡単ではありません。",
			"デジタル仏教はパーリ語の原文と訳文を一つの場所に集め、読者自身が本文を確かめられるようにします。",
		],
		problemTitle: "共有された本文には、共有されたプロセスを。",
		problemParagraphs: [
			"一つの訳だけでは、翻訳者が選んだ表現の背景が見えにくいことがあります。",
			"機械翻訳は入口になりますが、丁寧に読み、直していく余地があります。",
			"読者が訳を比べ、原文の意味を最もよく伝える候補を支えられるようにします。",
		],
		features: [
			{
				title: "読む",
				description: "パーリ語の原文と訳文を、一節ずつ並べて読めます。",
			},
			{
				title: "比べる",
				description: "複数の翻訳候補を比べながら、原文をいつでも確認できます。",
			},
			{
				title: "磨く",
				description:
					"忠実だと思う訳に投票し、コレクションを少しずつ良くします。",
			},
			{
				title: "届ける",
				description: "一人ひとりが最も理解しやすい言葉で、仏典に近づけます。",
			},
		],
		comparisonTitle: "この読み方が異なるところ",
		comparisonColumns: ["デジタル仏教", "一般的な版"],
		comparisonRows: [
			["原文", "各節にパーリ語原文を表示", "訳文と分かれていることが多い"],
			["翻訳", "候補を比べられる", "一つの訳だけを読むことが多い"],
			["品質", "読者が忠実な表現に投票", "訂正を共有しにくい"],
		],
		faqTitle: "よくある質問",
		faq: [
			[
				"ここでは何を読めますか？",
				"公開されたパーリ語仏典の一節を、翻訳と、利用できる場合は注釈とともに読めます。",
			],
			[
				"翻訳はどのように選ばれますか？",
				"翻訳候補を並べて表示し、認証済みの読者が原文に忠実だと思う訳に投票できます。",
			],
			[
				"翻訳なしで原文を読めますか？",
				"はい。翻訳がまだない場合でも、公開された一節のパーリ語原文は表示されます。",
			],
			[
				"どの言語に対応していますか？",
				"パーリ語、日本語、英語、中国語、韓国語、スペイン語など、グローバルな対応localeを維持しています。",
			],
		],
		finalTitle: "ブッダの言葉から、読み始めよう。",
		explore: "仏典を読む",
	},
	zh: {
		brand: "Digital Buddhism",
		heroTitle: "一起阅读巴利语经典。",
		heroDetail:
			"将巴利语原文与译文候选并读，比较不同理解，并通过投票让更忠实的译文被看见。",
		stats: ["巴利语原文", "译文候选", "支持语言"],
		founderTitle: "为什么要有这里",
		founderParagraphs: [
			"佛陀的话值得跨越语言继续被阅读。",
			"当原文、语境和不同译法散落在各处时，寻找可靠译文并不容易。",
			"Digital Buddhism 将巴利语原文和译文放在一起，让读者可以亲自核对文本。",
		],
		problemTitle: "共同的文本，需要共同的过程。",
		problemParagraphs: [
			"只看一个译本，很难了解译者做出的选择。",
			"机器翻译可以成为入口，但仍需要细读与修订。",
			"读者应当可以比较候选译文，并支持最忠实于原文的表达。",
		],
		features: [
			{ title: "阅读", description: "逐段并读巴利语原文与译文。" },
			{ title: "比较", description: "比较多个译文候选，阅读时随时查看原文。" },
			{
				title: "完善",
				description: "为最忠实的译文投票，让经典逐渐变得更易读。",
			},
			{
				title: "传播",
				description: "让每位读者都能用自己最熟悉的语言接近佛典。",
			},
		],
		comparisonTitle: "这种阅读方式有何不同",
		comparisonColumns: ["Digital Buddhism", "传统版本"],
		comparisonRows: [
			["原文", "每段都显示巴利语原文", "原文常与译文分开"],
			["译文", "可以比较不同候选", "通常一次阅读一个译本"],
			["质量", "读者可以为忠实表达投票", "不易共享修订"],
		],
		faqTitle: "常见问题",
		faq: [
			[
				"这里可以读什么？",
				"可以阅读已发布的巴利语经典段落，以及可用的译文和注释。",
			],
			[
				"如何选择译文？",
				"译文候选会一起显示，经过认证的读者可以为最忠实的译文投票。",
			],
			[
				"没有译文时可以读原文吗？",
				"可以。即使尚无译文，已发布段落的巴利语原文仍会显示。",
			],
			[
				"支持哪些语言？",
				"服务保持全球locale集合，包含巴利语、日语、英语、中文、韩语和西班牙语等。",
			],
		],
		finalTitle: "从佛陀的话开始阅读。",
		explore: "探索佛典",
	},
	ko: {
		brand: "Digital Buddhism",
		heroTitle: "팔리어 경전을 함께 읽습니다.",
		heroDetail:
			"팔리어 원문과 번역 후보를 나란히 읽고, 해석을 비교하며, 원문에 충실한 번역을 투표로 찾아갑니다.",
		stats: ["팔리어 원문", "번역 후보", "지원 언어"],
		founderTitle: "이곳을 만든 이유",
		founderParagraphs: [
			"붓다의 말씀은 언어를 넘어 계속 읽힐 가치가 있습니다.",
			"원문과 맥락, 서로 다른 해석이 흩어져 있으면 믿을 만한 번역을 찾고 직접 확인하기 어렵습니다.",
			"Digital Buddhism은 팔리어 원문과 번역을 한곳에 모아 독자가 텍스트를 직접 확인하도록 돕습니다.",
		],
		problemTitle: "함께 읽는 텍스트에는 함께 만드는 과정이 필요합니다.",
		problemParagraphs: [
			"하나의 번역만으로는 번역자가 선택한 표현을 알기 어렵습니다.",
			"기계 번역은 시작점이지만 세심한 읽기와 수정이 필요합니다.",
			"독자는 후보를 비교하고 원문을 가장 잘 보존한 번역을 지지할 수 있어야 합니다.",
		],
		features: [
			{
				title: "읽기",
				description: "팔리어 원문과 번역을 구절별로 나란히 읽습니다.",
			},
			{
				title: "비교",
				description: "여러 번역 후보를 비교하며 원문을 확인합니다.",
			},
			{
				title: "다듬기",
				description: "가장 충실한 번역에 투표해 컬렉션을 개선합니다.",
			},
			{
				title: "전하기",
				description: "각 독자가 익숙한 언어로 불교 경전에 다가갑니다.",
			},
		],
		comparisonTitle: "이 읽기 방식이 다른 점",
		comparisonColumns: ["Digital Buddhism", "일반적인 판본"],
		comparisonRows: [
			[
				"원문",
				"각 구절에 팔리어 원문 표시",
				"번역과 분리되어 있는 경우가 많음",
			],
			["번역", "후보를 비교할 수 있음", "보통 한 번역만 읽음"],
			["품질", "독자가 충실한 표현에 투표", "수정을 공유하기 어려움"],
		],
		faqTitle: "자주 묻는 질문",
		faq: [
			[
				"무엇을 읽을 수 있나요?",
				"번역과 가능한 경우 주석을 함께 제공하는 공개 팔리어 경전 구절을 읽을 수 있습니다.",
			],
			[
				"번역은 어떻게 선택하나요?",
				"번역 후보를 함께 보고 인증된 독자가 가장 충실하다고 생각하는 번역에 투표합니다.",
			],
			[
				"번역 없이 원문을 읽을 수 있나요?",
				"네. 번역이 없어도 공개된 구절의 팔리어 원문은 표시됩니다.",
			],
			[
				"어떤 언어를 지원하나요?",
				"팔리어, 일본어, 영어, 중국어, 한국어, 스페인어 등을 포함한 글로벌 locale을 유지합니다.",
			],
		],
		finalTitle: "붓다의 말씀부터 읽어 보세요.",
		explore: "경전 둘러보기",
	},
	es: {
		brand: "Digital Buddhism",
		heroTitle: "Lee el canon pāli con otros lectores.",
		heroDetail:
			"Lee el original pāli junto a las traducciones candidatas, compara interpretaciones y vota por las traducciones más fieles.",
		stats: ["original pāli", "traducciones candidatas", "idiomas disponibles"],
		founderTitle: "Por qué existe este espacio",
		founderParagraphs: [
			"Las palabras del Buda merecen seguir siendo legibles más allá de los idiomas.",
			"Cuando el original, el contexto y las distintas interpretaciones están separados, es difícil encontrar una traducción fiable.",
			"Digital Buddhism reúne el original pāli y sus traducciones para que cada lector pueda comprobar el texto.",
		],
		problemTitle: "Un texto compartido necesita un proceso compartido.",
		problemParagraphs: [
			"Una sola traducción puede ocultar las decisiones de quien traduce.",
			"La traducción automática abre una puerta, pero todavía necesita lectura y corrección cuidadosas.",
			"Los lectores deben poder comparar candidatas y apoyar la que conserva mejor el original.",
		],
		features: [
			{
				title: "Leer",
				description: "Lee el original pāli y su traducción, pasaje a pasaje.",
			},
			{
				title: "Comparar",
				description: "Compara candidatas y mantén el original a la vista.",
			},
			{
				title: "Mejorar",
				description:
					"Vota por la versión más fiel y ayuda a mejorar la colección.",
			},
			{
				title: "Compartir",
				description:
					"Acerca los textos budistas al idioma que cada lector entiende mejor.",
			},
		],
		comparisonTitle: "Qué hace diferente esta forma de leer",
		comparisonColumns: ["Digital Buddhism", "Una edición convencional"],
		comparisonRows: [
			[
				"Original",
				"Original pāli en cada pasaje",
				"A menudo separado de la traducción",
			],
			[
				"Traducciones",
				"Se pueden comparar candidatas",
				"Normalmente una traducción a la vez",
			],
			[
				"Calidad",
				"Los lectores votan por la fidelidad",
				"Es difícil compartir correcciones",
			],
		],
		faqTitle: "Preguntas frecuentes",
		faq: [
			[
				"¿Qué puedo leer aquí?",
				"Pasajes publicados de escrituras pāli, con traducciones y comentarios cuando están disponibles.",
			],
			[
				"¿Cómo se seleccionan las traducciones?",
				"Las candidatas aparecen juntas y los lectores autenticados pueden votar por la más fiel.",
			],
			[
				"¿Puedo leer el original sin traducción?",
				"Sí. El original pāli de cada pasaje publicado permanece visible aunque todavía no haya traducción.",
			],
			[
				"¿Qué idiomas son compatibles?",
				"Mantenemos el conjunto global de locales, incluidos pāli, japonés, inglés, chino, coreano y español.",
			],
		],
		finalTitle: "Empieza con las palabras del Buda.",
		explore: "Explorar las escrituras",
	},
};

export function getAboutCopy(locale: string): AboutCopy {
	return localized[locale.toLowerCase().split("-")[0]] ?? english;
}
