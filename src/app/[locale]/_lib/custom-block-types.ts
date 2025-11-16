/**
 * カスタムブロック記法のタイプ定義
 *
 * これらのタイプは `::type\n...\n::` 形式で使用され、
 * `<p class="type">` に変換されます。
 */

export const GATHA_BLOCK_TYPES = [
	"gatha1",
	"gatha2",
	"gatha3",
	"gathalast",
] as const;

export const BLOCK_TYPES = ["indent", "unindented", "centre"] as const;

export const HANGNUM_BLOCK_TYPE = "hangnum" as const;

export const ALL_CUSTOM_BLOCK_TYPES = [
	...GATHA_BLOCK_TYPES,
	...BLOCK_TYPES,
	HANGNUM_BLOCK_TYPE,
] as const;

export type CustomBlockType =
	| (typeof GATHA_BLOCK_TYPES)[number]
	| (typeof BLOCK_TYPES)[number]
	| typeof HANGNUM_BLOCK_TYPE;

/**
 * ブロックタイプからCSSクラス名へのマッピング
 */
export const BLOCK_TYPE_TO_CLASS: Record<CustomBlockType, string> = {
	gatha1: "gatha1",
	gatha2: "gatha2",
	gatha3: "gatha3",
	gathalast: "gathalast",
	indent: "indent",
	unindented: "unindented",
	centre: "centre",
	hangnum: "hangnum",
};

/**
 * ブロックタイプが有効かどうかをチェック
 */
export function isValidBlockType(
	blockType: string,
): blockType is CustomBlockType {
	return ALL_CUSTOM_BLOCK_TYPES.includes(blockType as CustomBlockType);
}
