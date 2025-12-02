/**
 * 入力文字列をスラグに変換する
 * 同じ入力に対して常に同じスラグを生成する（一意性を保証）
 */
export function slugify(input: string): string {
	const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	const ascii = normalized
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return ascii || "untitled";
}
