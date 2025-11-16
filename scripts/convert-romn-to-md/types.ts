// ノンスプリット用の最小データ型（章の概念は持たない）
export interface BookDoc {
	// <body> 直下の要素（見出し・本文・注記など）を順番に並べたもの
	nodes: Element[];
	// books.json に定義された自身の分類パス（ムーラへ解決しない）
	dirSegments: string[];
}
