import { beautifySlug } from "./utils/beautify-slug";

/**
 * ディレクトリセグメント名から順序番号とタイトルを抽出する
 *
 * ディレクトリ名が "数字-" で始まる場合、その数字を順序番号として使用し、残りをタイトルとして返す。
 * 数字が含まれない場合、エラーを投げる。
 *
 * @param dirSegment - ディレクトリセグメント名（例: "01-sutta", "02-diggha-nikaya"）
 * @returns 順序番号とタイトルのオブジェクト
 *
 * @example
 * parseDirSegment("01-sutta") // { order: 1, title: "Sutta" }
 * parseDirSegment("02-diggha-nikaya") // { order: 2, title: "Diggha Nikaya" }
 */
export function parseDirSegment(dirSegment: string): {
	title: string;
	order: number;
} {
	const match = dirSegment.match(/^(\d+)-(.*)$/);
	if (!match) {
		throw new Error(`Invalid directory segment: ${dirSegment}`);
	}
	const order = Number.parseInt(match[1], 10);
	const raw = match[2] ?? dirSegment;
	return { order, title: beautifySlug(raw) };
}
