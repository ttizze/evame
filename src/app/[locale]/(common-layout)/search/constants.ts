export const CATEGORIES = ["title", "content"] as const;
export type Category = (typeof CATEGORIES)[number];

const SEARCH_COPY = {
	en: {
		title: "Search scriptures",
		description:
			"Search published Buddhist scriptures by title or source text.",
		placeholder: "Search...",
		titleTab: "Title",
		contentTab: "Source text",
		noResults: "No scriptures found.",
		searchButton: "Search",
	},
	ja: {
		title: "仏典を検索",
		description: "公開されている仏典を題名や原文から検索できます。",
		placeholder: "検索…",
		titleTab: "題名",
		contentTab: "原文",
		noResults: "仏典が見つかりません。",
		searchButton: "検索",
	},
	zh: {
		title: "搜索经典",
		description: "按标题或原文搜索已发布的佛教经典。",
		placeholder: "搜索…",
		titleTab: "标题",
		contentTab: "原文",
		noResults: "未找到经典。",
		searchButton: "搜索",
	},
	ko: {
		title: "경전 검색",
		description: "제목이나 원문으로 공개된 불교 경전을 검색하세요.",
		placeholder: "검색…",
		titleTab: "제목",
		contentTab: "원문",
		noResults: "경전을 찾을 수 없습니다.",
		searchButton: "검색",
	},
	es: {
		title: "Buscar escrituras",
		description:
			"Busca escrituras budistas publicadas por título o texto original.",
		placeholder: "Buscar…",
		titleTab: "Título",
		contentTab: "Texto original",
		noResults: "No se encontraron escrituras.",
		searchButton: "Buscar",
	},
} as const;

export function getSearchCopy(locale: string) {
	return (
		SEARCH_COPY[
			locale.toLowerCase().split("-")[0] as keyof typeof SEARCH_COPY
		] ?? SEARCH_COPY.en
	);
}
