// 目的: 抽出フェーズとレンダリングフェーズの間で共有する章データの型を定義する。
// 処理: 書名や章題に加えて Books.cs 由来の分類セグメントを保持する。
export interface Chapter {
	book: string;
	title: string;
	// 目的: フォルダ名の章タイトルをムーラ基準に固定するための任意フィールド。
	// 処理: 注釈を変換する際、対応するムーラの章タイトルを設定する。
	baseTitle?: string;
	order: number;
	prefaceNodes: Element[];
	contentNodes: Element[];
	// 目的: 事前計算済みのスラグ＋順序付きディレクトリセグメント。
	// 処理: 実行時のスラグ化を避け、再現性の高い出力パスを得る。
	dirSegments?: string[];
}
