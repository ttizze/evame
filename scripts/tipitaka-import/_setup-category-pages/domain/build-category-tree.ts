import { ROOT_TITLE } from "../../constants";
import { parseDirSegment } from "../../domain/parse-dir-segment";
import type { CategoryNode, TipitakaFileMeta } from "../../types";
import { beautifySlug } from "../../utils/beautify-slug";

/**
 * Tipitakaファイルのメタデータからカテゴリツリーを構築する
 *
 * 各ファイルの `dirSegments`（ディレクトリパス）をルートから順に辿り、
 * 存在しないノードを `root.children` に追加することで階層構造を構築します。
 * 同じパスを持つファイルが複数ある場合でも、ノードは共有されます。
 *
 * **処理の流れ**:
 * 1. 空のルートノードを作成
 * 2. 各ファイルの `dirSegments`（例: `["01-sutta", "02-diggha-nikaya"]`）を処理:
 *    - ルートから順に各セグメントを辿る
 *    - セグメントに対応する子ノードが存在しない場合、新しく作成して `current.children` に追加
 *    - 次のセグメントへ進む
 * 3. すべてのファイルを処理した後、階層構造が完成したルートノードを返す
 *
 * **重要**: この関数は `root` オブジェクト自体を返していますが、実際には
 * `root.children` とその子孫ノード全体に階層構造を構築しています。
 * 返されたルートノードを通じて、構築されたツリー全体にアクセスできます。
 *
 * @param tipitakaFileMetas - Tipitakaファイルのメタデータ配列
 * @returns 構築されたカテゴリツリーのルートノード（`root.children` に階層構造が含まれる）
 *
 * @example
 * 入力:
 * - File1: dirSegments = ["01-sutta", "02-diggha-nikaya"]
 * - File2: dirSegments = ["01-sutta", "03-majjhima-nikaya"]
 *
 * 構築されるツリー:
 * ```
 * root
 * └── 01-sutta
 *     ├── 02-diggha-nikaya
 *     └── 03-majjhima-nikaya
 * ```
 */
export function buildCategoryTree(
	tipitakaFileMetas: TipitakaFileMeta[],
): CategoryNode {
	// 空のルートノードを作成（この children Map に階層構造全体が構築される）
	const root: CategoryNode = {
		dirSegment: "",
		title: beautifySlug(ROOT_TITLE),
		order: 0,
		children: new Map(),
	};

	// 各ファイルのディレクトリパスを処理して、root.children に階層構造を構築
	for (const tipitakaFileMeta of tipitakaFileMetas) {
		let current = root;
		// 各ディレクトリセグメントを順に辿る（例: ["01-sutta", "02-diggha-nikaya"]）
		for (const dirSegment of tipitakaFileMeta.dirSegments) {
			// このセグメントに対応する子ノードが存在しない場合、新しく作成
			if (!current.children.has(dirSegment)) {
				const { order, title } = parseDirSegment(dirSegment);
				// current.children に新しいノードを追加（これがツリーを構築する）
				current.children.set(dirSegment, {
					dirSegment,
					title,
					order,
					children: new Map<string, CategoryNode>(),
				});
			}
			// 次のレベルへ進むために、子ノードを取得
			const child = current.children.get(dirSegment);
			if (!child) {
				throw new Error(`Failed to resolve directory segment: ${dirSegment}`);
			}
			current = child; // 次のセグメントはこの子ノードから続く
		}
	}

	// root.children に構築された階層構造全体を含むルートノードを返す
	return root;
}
