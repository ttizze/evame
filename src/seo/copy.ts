import { type SupportedLocale, supportedLocales } from "@/domain/locales";

type SeoCopy = {
	indexTitle: string;
	indexDescription: string;
	readerLabel: string;
	readerDescription: string;
	notFoundTitle: string;
	notFoundDescription: string;
};

const englishSeoCopy: SeoCopy = {
	indexTitle: "Digital Buddhism — Buddhist scriptures",
	indexDescription:
		"Read Buddhist scriptures and compare translation candidates across languages.",
	readerLabel: "Buddhist scriptures",
	readerDescription:
		"Read the source text and compare translation candidates across languages.",
	notFoundTitle: "Scripture not found",
	notFoundDescription:
		"The requested text is not available in this collection.",
};

// origin/main の既存メッセージ資産に対応する5 localeは、その言語の copy を維持する。
const localizedSeoCopy: Partial<Record<SupportedLocale, SeoCopy>> = {
	en: englishSeoCopy,
	ja: {
		indexTitle: "デジタル仏教 — 仏典",
		indexDescription: "仏典を読み、さまざまな言語の翻訳案を比較できます。",
		readerLabel: "仏典",
		readerDescription: "原文を読み、さまざまな言語の翻訳案を比較できます。",
		notFoundTitle: "仏典が見つかりません",
		notFoundDescription: "指定された仏典はこのコレクションにありません。",
	},
	zh: {
		indexTitle: "数字佛教 — 佛教经典",
		indexDescription: "阅读佛教经典，比较不同语言的翻译方案。",
		readerLabel: "佛教经典",
		readerDescription: "阅读原文，比较不同语言的翻译方案。",
		notFoundTitle: "未找到佛典",
		notFoundDescription: "请求的文本不在此收藏中。",
	},
	es: {
		indexTitle: "Budismo Digital — Escrituras budistas",
		indexDescription:
			"Lee escrituras budistas y compara propuestas de traducción en distintos idiomas.",
		readerLabel: "Escrituras budistas",
		readerDescription:
			"Lee el texto original y compara propuestas de traducción en distintos idiomas.",
		notFoundTitle: "Escritura no encontrada",
		notFoundDescription:
			"El texto solicitado no está disponible en esta colección.",
	},
	ko: {
		indexTitle: "디지털 불교 — 불교 경전",
		indexDescription: "불교 경전을 읽고 여러 언어의 번역 후보를 비교하세요.",
		readerLabel: "불교 경전",
		readerDescription: "원문을 읽고 여러 언어의 번역 후보를 비교하세요.",
		notFoundTitle: "경전을 찾을 수 없습니다",
		notFoundDescription: "요청한 텍스트는 이 컬렉션에 없습니다.",
	},
};

export function getSeoCopy(locale: string): SeoCopy {
	const selectedLocale = supportedLocales.find(
		({ code }) => code === locale,
	)?.code;
	return selectedLocale
		? (localizedSeoCopy[selectedLocale] ?? englishSeoCopy)
		: englishSeoCopy;
}
