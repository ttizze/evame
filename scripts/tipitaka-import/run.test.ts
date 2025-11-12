/*
目的: runTipitakaImport の「段落番号(§ N)一致によるリンク生成」と「主要な例外ケース」を担保する。

方法: インフラ依存(DB/Markdown解析/FS)をモックして、リンク生成ロジックのみを決定的に検証する。
- Prisma: user/segment/segmentLink の最小APIのみモック
- segment-types: 必要IDを固定返却(正常)＋欠如ケースを差し替え
- root-page/pages: DBに触れず pageId を割り当てるだけのダブル
- books: Mula/Atthakatha/Tika の最小3件を固定返却
- segment.findMany: ページIDごとに § を含むテキスト配列を返し、正規表現抽出→マッピング→リンク生成を検証

担保できること:
- §番号が一致すれば注釈→ムーラの全組み合わせでリンクを作成する
- §不一致ならリンクは0件となる
- 同一§番号の多対多組み合わせがすべて生成される
- ユーザ未存在、PRIMARY/OTHER 不足時に意図したエラーを投げる
- segmentLink.createMany の呼び出し回数と skipDuplicates を含むペイロードを検証する

非目標(カバー外):
- Markdown→MDAST 変換や slug 生成の正当性
- ディレクトリ階層構築や順序安定性の詳細(処理順は Mula→注釈に依存するが、ここではリンク生成の成否のみを見る)
- 実DB書き込みやユニーク制約の検証
*/
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureSegmentTypes } from "./segment-types";
import type { DirectoryNode, ImportEntry } from "./types";

// テスト対象のモジュールを読み込む前に、依存をすべてモック化する

// 1) @prisma/client を最小限のテストダブルでモック
type SegmentRecord = { id: number; text: string };
type SegmentFindManyArgs = { where: { contentId: number } };
type SegmentLinkCreateManyArgs = {
	data: { fromSegmentId: number; toSegmentId: number }[];
	skipDuplicates: boolean;
};
const segmentFindManyMock =
	vi.fn<(args: SegmentFindManyArgs) => Promise<SegmentRecord[]>>();
const segmentLinkCreateManyMock =
	vi.fn<(args: SegmentLinkCreateManyArgs) => Promise<void>>();
const userFindUniqueMock =
	vi.fn<
		(args: { where: { handle: string } }) => Promise<{
			id: string;
			handle: string;
		} | null>
	>();

vi.mock("@prisma/client", () => {
	class PrismaClient {
		user: { findUnique: typeof userFindUniqueMock } = {
			findUnique: userFindUniqueMock,
		};
		segment: { findMany: typeof segmentFindManyMock } = {
			findMany: segmentFindManyMock,
		};
		segmentLink: { createMany: typeof segmentLinkCreateManyMock } = {
			createMany: segmentLinkCreateManyMock,
		};
		async $disconnect(): Promise<void> {}
	}
	return { PrismaClient };
});

// 2) セグメント種別IDは固定値を返す
vi.mock("./segment-types", () => ({
	ensureSegmentTypes: vi.fn().mockResolvedValue([
		{ key: "PRIMARY", id: 1 },
		{ key: "OTHER", id: 2 },
		{ key: "MULA", id: 3 },
		{ key: "ATTHAKATHA", id: 4 },
		{ key: "TIKA", id: 5 },
	]),
}));

// 3) ルートページは固定のIDを返す
vi.mock("./root-page", () => ({
	ensureRootPage: vi.fn().mockResolvedValue({ id: 10, content: {} }),
}));

// 4) ディレクトリページ/コンテンツページ作成はDBに触れないテストダブル
let nextContentPageId = 100;
vi.mock("./pages", () => ({
	createDirectoryPage: vi
		.fn()
		.mockImplementation(async ({ node }: { node: DirectoryNode }) => {
			// ディレクトリノードに予測可能な pageId を付与
			node.pageId = ++nextContentPageId;
		}),
	createContentPage: vi
		.fn()
		.mockImplementation(async ({ entry }: { entry: ImportEntry }) => {
			// fileKey に応じて固定のページIDを返す（決定的なテストのため）
			if (entry.fileKey === "s0101m.mul") return 100; // Mula
			if (entry.fileKey === "s0101a.att") return 200; // Atthakatha
			if (entry.fileKey === "s0101t.tika") return 300; // Tika
			return ++nextContentPageId;
		}),
}));

// 5) books データは最小限の3件（Mula/Atthakatha/Tika）
vi.mock("./books", () => ({
	readBooksJson: vi.fn().mockResolvedValue({
		entries: [
			{
				fileKey: "s0101m.mul",
				level: "Mula",
				dirSegments: ["01-root", "01-child"],
				mulaFileKey: null,
			},
			{
				fileKey: "s0101a.att",
				level: "Atthakatha",
				dirSegments: ["01-root", "01-child"],
				mulaFileKey: "s0101m.mul",
			},
			{
				fileKey: "s0101t.tika",
				level: "Tika",
				dirSegments: ["01-root", "01-child"],
				mulaFileKey: "s0101m.mul",
			},
		] as ImportEntry[],
		indexMap: new Map<number, ImportEntry>(),
	}),
}));

// 事前条件: ユーザと各ページのセグメントを決定的に返す
beforeEach(() => {
	userFindUniqueMock.mockResolvedValue({ id: "user-1", handle: "evame" });

	// contentId ごとに §N を含むテキストを返す
	segmentFindManyMock.mockImplementation(
		async ({ where }: SegmentFindManyArgs) => {
			const contentId = where.contentId;
			if (contentId === 100) {
				// Mula: §1 と §2 を持つ
				return [
					{ id: 1001, text: "Intro § 1 text" },
					{ id: 1002, text: "More § 2 text" },
				];
			}
			if (contentId === 200) {
				// Atthakatha: §1 と §3（§1のみリンク対象）
				return [
					{ id: 2001, text: "Comment § 1 A" },
					{ id: 2002, text: "Comment § 3 B" },
				];
			}
			if (contentId === 300) {
				// Tika: §2（リンク対象）
				return [{ id: 3001, text: "Tika § 2 X" }];
			}
			return [];
		},
	);

	segmentLinkCreateManyMock.mockReset();
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("runTipitakaImport", () => {
	it("§番号が一致する場合、注釈(Atthakatha/Tika)→ムーラ(Mula)へのリンクを作成する", async () => {
		// 前提: デフォルトのモック（Mula: §1, §2 / Atth: §1, §3 / Tika: §2）
		const { runTipitakaImport } = await import("./run");

		// 操作: 取り込みを実行
		await runTipitakaImport();

		// 期待: Atthakatha と Tika の2回分リンク作成が発生
		expect(segmentLinkCreateManyMock).toHaveBeenCalledTimes(2);

		const firstCallArg = segmentLinkCreateManyMock.mock
			.calls[0]?.[0] as SegmentLinkCreateManyArgs;
		const secondCallArg = segmentLinkCreateManyMock.mock
			.calls[1]?.[0] as SegmentLinkCreateManyArgs;

		expect(firstCallArg).toMatchObject({ skipDuplicates: true });
		expect(secondCallArg).toMatchObject({ skipDuplicates: true });

		const links1 = firstCallArg.data as {
			fromSegmentId: number;
			toSegmentId: number;
		}[]; // Atthakatha
		const links2 = secondCallArg.data as {
			fromSegmentId: number;
			toSegmentId: number;
		}[]; // Tika

		// 期待: Atthakathaの§1→Mulaの§1（2001 -> 1001）
		expect(links1).toContainEqual({ fromSegmentId: 2001, toSegmentId: 1001 });
		// 期待: Atthakathaの§3はリンクされない
		expect(links1.find((l) => l.fromSegmentId === 2002)).toBeUndefined();

		// 期待: Tikaの§2→Mulaの§2（3001 -> 1002）
		expect(links2).toContainEqual({ fromSegmentId: 3001, toSegmentId: 1002 });
	});

	it("§番号が一致しない場合、リンクは一切作成されない", async () => {
		// 前提: すべて一致しないようにモックを上書き
		segmentFindManyMock.mockImplementation(
			async ({ where }: SegmentFindManyArgs) => {
				const id = where.contentId;
				if (id === 100) return [{ id: 1009, text: "Root only § 99" }]; // Mula
				if (id === 200) return [{ id: 2009, text: "Att only § 1" }]; // Atth
				if (id === 300) return [{ id: 3009, text: "Tika only § 2" }]; // Tika
				return [];
			},
		);

		const { runTipitakaImport } = await import("./run");

		// 操作
		await runTipitakaImport();

		// 期待: createMany は呼ばれない
		expect(segmentLinkCreateManyMock).not.toHaveBeenCalled();
	});

	it("同一§番号に複数セグメントがある場合、全組み合わせでリンクが作成される", async () => {
		// 前提: Mula §1 が2件、Atthakatha §1 が2件 → 2x2=4リンク
		segmentFindManyMock.mockImplementation(
			async ({ where }: SegmentFindManyArgs) => {
				const id = where.contentId;
				if (id === 100) {
					return [
						{ id: 1101, text: "Root A § 1" },
						{ id: 1102, text: "Root B § 1" },
					];
				}
				if (id === 200) {
					return [
						{ id: 2101, text: "Att A § 1" },
						{ id: 2102, text: "Att B § 1" },
					];
				}
				if (id === 300) {
					return [{ id: 3101, text: "Tika § 999" }];
				}
				return [];
			},
		);

		const { runTipitakaImport } = await import("./run");
		await runTipitakaImport();

		// 期待: Atthakatha 側で 4 リンク（2x2）作成、Tika 側はリンクなし
		expect(segmentLinkCreateManyMock).toHaveBeenCalledTimes(1);
		const arg = segmentLinkCreateManyMock.mock
			.calls[0]?.[0] as SegmentLinkCreateManyArgs;
		const links = arg.data as { fromSegmentId: number; toSegmentId: number }[];
		expect(links).toEqual(
			expect.arrayContaining([
				{ fromSegmentId: 2101, toSegmentId: 1101 },
				{ fromSegmentId: 2101, toSegmentId: 1102 },
				{ fromSegmentId: 2102, toSegmentId: 1101 },
				{ fromSegmentId: 2102, toSegmentId: 1102 },
			]),
		);
		expect(links).toHaveLength(4);
	});

	it("ユーザ(evame)が存在しないとき、エラーになる", async () => {
		// 前提: ユーザ検索が null を返す
		userFindUniqueMock.mockResolvedValueOnce(null);
		const { runTipitakaImport } = await import("./run");

		// 操作/期待
		await expect(runTipitakaImport()).rejects.toThrow(
			/User with handle evame not found/,
		);
	});

	it("PRIMARY のセグメント種別が無いとき、エラーになる", async () => {
		// 前提: ensureSegmentTypes の返却から PRIMARY を取り除く
		type SegmentTypeRow = { key: string; id: number };
		(
			ensureSegmentTypes as unknown as {
				mockResolvedValue: (value: SegmentTypeRow[]) => unknown;
			}
		).mockResolvedValue([
			{ key: "OTHER", id: 2 },
			{ key: "MULA", id: 3 },
			{ key: "ATTHAKATHA", id: 4 },
			{ key: "TIKA", id: 5 },
		]);

		const { runTipitakaImport } = await import("./run");
		await expect(runTipitakaImport()).rejects.toThrow(
			/Segment type "PRIMARY" not found/,
		);
	});

	it("OTHER のセグメント種別が無いとき、エラーになる", async () => {
		// 前提: ensureSegmentTypes の返却から OTHER を取り除く
		type SegmentTypeRow = { key: string; id: number };
		(
			ensureSegmentTypes as unknown as {
				mockResolvedValue: (value: SegmentTypeRow[]) => unknown;
			}
		).mockResolvedValue([
			{ key: "PRIMARY", id: 1 },
			{ key: "MULA", id: 3 },
			{ key: "ATTHAKATHA", id: 4 },
			{ key: "TIKA", id: 5 },
		]);

		const { runTipitakaImport } = await import("./run");
		await expect(runTipitakaImport()).rejects.toThrow(
			/Segment type "OTHER" not found/,
		);
	});
});
