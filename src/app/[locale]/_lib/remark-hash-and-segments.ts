import type {
  Blockquote,
  Heading,
  ListItem,
  Node,
  Paragraph,
  Root,
  RootContent,
  TableCell,
} from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { Data, VFile } from 'vfile';
import { generateHashForText } from './generate-hash-for-text';
/* ---------- 共通型 ---------- */

export interface SegmentDraft {
  hash: string;
  text: string;
  number: number;
}

/* mdast で「1 ブロック」とみなすノード型 */
type BlockNode = Paragraph | Heading | ListItem | Blockquote | TableCell;

/* visit のテスト引数で使うリストと Set（ネスト判定用） */
const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'listItem',
  'blockquote',
  'tableCell',
] as const satisfies ReadonlyArray<BlockNode['type']>;
const BLOCK_SET = new Set<string>(BLOCK_TYPES);

const canonicalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

interface SegmentData extends Data {
  segments: SegmentDraft[];
}

/* ---------- プラグイン本体 ---------- */

export const remarkHashAndSegments =
  (header?: string): Plugin<[], Root> =>
  () =>
  (tree: Root, file: VFile) => {
    /* data.segments を型安全に初期化 */
    const f = file as typeof file & { data: SegmentData };
    f.data.segments ??= [];

    const occ = new Map<string, number>();
    let number = 1; // 0 はタイトル用、本文は 1 から

    /* ── 0. タイトル ─────────────────── */
    if (header?.trim()) {
      const hash = generateHashForText(header, 0);
      f.data.segments.push({ hash, text: header, number: 0 });
      occ.set(canonicalize(header), 0);
    }

    /* ── 1. 本文ブロック ─────────────── */
    visit(
      tree,
      (node: Node): boolean => {
        const nodeType = node.type;
        return BLOCK_TYPES.includes(nodeType as BlockNode['type']);
      },
      (node) => {
        const typedNode = node as BlockNode;

        /* ネストしたブロック要素は除外 */
        const hasNestedBlock =
          'children' in typedNode &&
          (typedNode.children as RootContent[]).some((c) =>
            BLOCK_SET.has(c.type)
          );
        if (hasNestedBlock) return;

        /* テキスト抽出（画像のalt属性は除外） */
        const merged = mdastToString(typedNode, {
          includeImageAlt: false,
        }).trim();
        if (!merged) return;

        /* ハッシュ生成 */
        const canon = canonicalize(merged);
        const n = (occ.get(canon) ?? 0) + 1;
        occ.set(canon, n);

        const hash = generateHashForText(merged, n);

        /* HTML 変換時用の data-number-id を付与 */
        if (typedNode.data === undefined) {
          typedNode.data = {};
        }
        const data = typedNode.data as Data & {
          hProperties?: Record<string, unknown>;
        };

        if (data.hProperties === undefined) {
          data.hProperties = {};
        }
        (data.hProperties as Record<string, string>)['data-number-id'] =
          number.toString();

        f.data.segments.push({ hash, text: merged, number });
        number += 1; // ← 純連番インクリメント
      }
    );
  };
