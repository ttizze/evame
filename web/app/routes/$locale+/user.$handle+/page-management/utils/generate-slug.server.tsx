import { toASCII } from "node:punycode";
import { customAlphabet } from "nanoid";

const generateRandomString = customAlphabet(
	"abcdefghijklmnopqrstuvwxyz0123456789",
	12,
);

function sanitizeSlug(input: string): string {
	// ASCIIに変換
	let slug = toASCII(input);

	// 英数字とハイフン以外の文字をハイフンに置換
	slug = slug.replace(/[^a-zA-Z0-9-]+/g, "-");

	// 連続するハイフンを単一のハイフンに置換
	slug = slug.replace(/-+/g, "-");

	// 先頭と末尾のハイフンを削除
	slug = slug.replace(/^-|-$/g, "");

	// 小文字に変換
	return slug.toLowerCase();
}

export async function generateSlug(input: string): Promise<string> {
	// スラグをサニタイズ
	const slug = sanitizeSlug(input);

	// ランダムな文字列を追加
	const randomString = generateRandomString();

	// 最終的なslugを生成（最大長を考慮）
	const maxLength = 50;
	const slugPart = slug.slice(0, maxLength - randomString.length - 1);
	return `${slugPart}-${randomString}`;
}
