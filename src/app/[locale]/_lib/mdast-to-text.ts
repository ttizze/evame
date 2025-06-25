import type { Prisma } from '@prisma/client';

export async function mdastToText(
  mdastJson: Prisma.JsonValue
): Promise<string> {
  if (mdastJson == null) return '';

  // ① 文字列・数値・真偽はそのまま／文字列化
  if (typeof mdastJson === 'string') return mdastJson;
  if (typeof mdastJson === 'number' || typeof mdastJson === 'boolean')
    return String(mdastJson);

  // ② 配列は各要素を再帰
  if (Array.isArray(mdastJson)) {
    // 非同期処理を正しく処理
    const results = await Promise.all(
      mdastJson.map((item) => mdastToText(item))
    );
    return results.join('');
  }

  // ③ オブジェクト（MDAST ノード）の処理
  if (typeof mdastJson === 'object') {
    const node = mdastJson as Record<string, Prisma.JsonValue>;

    // text, inlineCode など: { value: "..." }
    if (typeof node.value === 'string') return node.value;

    // 画像キャプション・リンクタイトルなど alt/title にも文字列がある場合
    if (typeof node.alt === 'string') return node.alt;
    if (typeof node.title === 'string') return node.title;

    // 子ノードを下る
    if (Array.isArray(node.children)) {
      // 非同期処理を正しく処理
      const results = await Promise.all(
        (node.children as Prisma.JsonValue[]).map((child) => mdastToText(child))
      );
      return results.join('');
    }
  }

  // ④ それ以外は無視
  return '';
}
