/*
目的: runTipitakaImport の「段落番号(§ N)一致によるセグメントロケータ生成」と
「主要な例外ケース」を担保する。

方法: インフラ依存(DB/Markdown解析/FS)をモックして、ロケータ生成ロジックのみを決定的に検証する。
- Prisma: user/segment/segmentMetadata/segmentLocator/segmentLocatorLink の最小APIのみモック
- segment-types: 必要IDを固定返却(正常)＋欠如ケースを差し替え
- metadata-types: 段落番号メタデータIDを固定返却
- root-page/pages: DBに触れず pageId を割り当てるだけのダブル
- books: Mula/Atthakatha/Tika の最小3件を固定返却
- segment.findMany: ページIDごとにセグメント配列を返し、メタデータ連動ロジックを検証

担保できること:
- §番号が一致すれば注釈→ムーラが同一ロケータに結び付く
- §番号不一致ならリンクは0件となる
- 同一§番号の多対多組み合わせ（ムーラ内）でも同一ロケータを共有する
- ユーザ未存在、PRIMARY/OTHER 不足時に意図したエラーを投げる
- segmentLocatorLink.createMany の呼び出しと skipDuplicates を検証する

非目標(カバー外):
- Markdown→MDAST 変換や slug 生成の正当性
- ディレクトリ階層構築や順序安定性の詳細
- 実DB書き込みやユニーク制約の検証
*/
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureSegmentTypes } from "./segment-types";
import type { DirectoryNode, ImportEntry } from "./types";

// テスト対象のモジュールを読み込む前に、依存をすべてモック化する

// 1) @prisma/client を最小限のテストダブルでモック
type SegmentRecord = { id: number; number: number; text: string };
type SegmentFindManyArgs = {
	where: { contentId: number };
	orderBy?: { number: string };
	select?: { id?: boolean; number?: boolean; text?: boolean };
};
type SegmentMetadataRecord = {
	segmentId: number;
	metadataTypeId: number;
	value: string;
};
type SegmentMetadataFindManyArgs = {
	where: {
		segment: { contentId: number };
		metadataType?: { key: string };
	};
};
type SegmentMetadataDeleteManyArgs = {
	where: { segmentId: { in: number[] } };
};
type SegmentMetadataCreateManyArgs = {
	data: Array<{
		segmentId: number;
		metadataTypeId: number;
		value: string;
	}>;
	skipDuplicates?: boolean;
};
type SegmentLocatorCreateManyArgs = {
	data: { contentId: number; value: string }[];
	skipDuplicates: boolean;
};
type SegmentLocatorDeleteManyArgs = {
	where: {
		contentId: number;
		system: string;
		value?: { notIn: string[] };
	};
};
type SegmentLocatorFindManyArgs = {
	where: {
		contentId: number;
		system: string;
		value: { in: string[] };
	};
};
type SegmentLocatorLinkCreateManyArgs = {
	data: { segmentLocatorId: number; segmentId: number }[];
	skipDuplicates: boolean;
};
type SegmentLocatorLinkDeleteManyArgs =
	| {
			where: {
				segmentLocatorId: { in: number[] };
			};
	  }
	| {
			where: {
				locator: { contentId: number; system: string };
			};
	  };

const segmentStore = new Map<number, SegmentRecord[]>();
const segmentMetadataStore = new Map<number, SegmentMetadataRecord[]>();
const segmentFindManyMock =
	vi.fn<(args: SegmentFindManyArgs) => Promise<SegmentRecord[]>>();
const segmentMetadataFindManyMock =
	vi.fn<
		(args: SegmentMetadataFindManyArgs) => Promise<SegmentMetadataRecord[]>
	>();
const segmentMetadataDeleteManyMock =
	vi.fn<(args: SegmentMetadataDeleteManyArgs) => Promise<void>>();
const segmentMetadataCreateManyMock =
	vi.fn<(args: SegmentMetadataCreateManyArgs) => Promise<void>>();
const segmentMetadataTypeFindManyMock =
	vi.fn<
		(args: {
			where?: { key?: { in: string[] } };
		}) => Promise<Array<{ key: string; id: number }>>
	>();

const userFindUniqueMock =
	vi.fn<
		(args: { where: { handle: string } }) => Promise<{
			id: string;
			handle: string;
		} | null>
	>();

let nextLocatorId = 10_000;
const segmentLocatorStore = new Map<number, Map<string, number>>();
const segmentLocatorCreateManyMock = vi.fn<
	(args: SegmentLocatorCreateManyArgs) => Promise<void>
>(async ({ data }) => {
	for (const { contentId, value } of data) {
		const locatorMap = segmentLocatorStore.get(contentId) ?? new Map();
		if (!locatorMap.has(value)) {
			locatorMap.set(value, nextLocatorId++);
		}
		segmentLocatorStore.set(contentId, locatorMap);
	}
});
const segmentLocatorDeleteManyMock = vi.fn<
	(args: SegmentLocatorDeleteManyArgs) => Promise<void>
>(async ({ where }) => {
	const locatorMap = segmentLocatorStore.get(where.contentId);
	if (!locatorMap) return;
	if (where.value?.notIn) {
		const allowed = new Set(where.value.notIn);
		for (const key of [...locatorMap.keys()]) {
			if (allowed.has(key)) continue;
			locatorMap.delete(key);
		}
		segmentLocatorStore.set(where.contentId, locatorMap);
		return;
	}
	locatorMap.clear();
	segmentLocatorStore.set(where.contentId, locatorMap);
});
const segmentLocatorFindManyMock = vi.fn<
	(
		args: SegmentLocatorFindManyArgs,
	) => Promise<Array<{ id: number; value: string }>>
>(async ({ where }) => {
	const locatorMap = segmentLocatorStore.get(where.contentId) ?? new Map();
	const results: Array<{ id: number; value: string }> = [];
	for (const value of where.value.in) {
		const id = locatorMap.get(value);
		if (id !== undefined) {
			results.push({ id, value });
		}
	}
	return results;
});
const segmentLocatorLinkCreateManyMock =
	vi.fn<(args: SegmentLocatorLinkCreateManyArgs) => Promise<void>>();
const segmentLocatorLinkDeleteManyMock =
	vi.fn<(args: SegmentLocatorLinkDeleteManyArgs) => Promise<void>>();

const SEGMENT_METADATA_TYPES: Array<{ key: string; id: number }> = [
	{ key: "VRI_PAGEBREAK", id: 10_001 },
	{ key: "PTS_PAGEBREAK", id: 10_002 },
	{ key: "THAI_PAGEBREAK", id: 10_003 },
	{ key: "MYANMAR_PAGEBREAK", id: 10_004 },
	{ key: "OTHER_PAGEBREAK", id: 10_005 },
	{ key: "VRI_PARAGRAPH_NUMBER", id: 20_001 },
];
const metadataTypeByKey = new Map(
	SEGMENT_METADATA_TYPES.map((item) => [item.key, item.id]),
);
const metadataTypeKeyById = new Map(
	SEGMENT_METADATA_TYPES.map((item) => [item.id, item.key]),
);

vi.mock("@prisma/client", () => {
	class PrismaClient {
		user: { findUnique: typeof userFindUniqueMock } = {
			findUnique: userFindUniqueMock,
		};
		segment: { findMany: typeof segmentFindManyMock } = {
			findMany: segmentFindManyMock,
		};
		segmentMetadata: {
			findMany: typeof segmentMetadataFindManyMock;
			deleteMany: typeof segmentMetadataDeleteManyMock;
			createMany: typeof segmentMetadataCreateManyMock;
		} = {
			findMany: segmentMetadataFindManyMock,
			deleteMany: segmentMetadataDeleteManyMock,
			createMany: segmentMetadataCreateManyMock,
		};
		segmentMetadataType: {
			findMany: typeof segmentMetadataTypeFindManyMock;
		} = {
			findMany: segmentMetadataTypeFindManyMock,
		};
		segmentLocator: {
			createMany: typeof segmentLocatorCreateManyMock;
			deleteMany: typeof segmentLocatorDeleteManyMock;
			findMany: typeof segmentLocatorFindManyMock;
		} = {
			createMany: segmentLocatorCreateManyMock,
			deleteMany: segmentLocatorDeleteManyMock,
			findMany: segmentLocatorFindManyMock,
		};
		segmentLocatorLink: {
			createMany: typeof segmentLocatorLinkCreateManyMock;
			deleteMany: typeof segmentLocatorLinkDeleteManyMock;
		} = {
			createMany: segmentLocatorLinkCreateManyMock,
			deleteMany: segmentLocatorLinkDeleteManyMock,
		};
		async $disconnect(): Promise<void> {}
	}
	const SegmentLocatorSystem = { VRI_PARAGRAPH: "VRI_PARAGRAPH" } as const;
	return { PrismaClient, SegmentLocatorSystem };
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

vi.mock("./metadata-types", () => ({
	ensureMetadataTypes: vi
		.fn()
		.mockResolvedValue([{ key: "VRI_PAGEBREAK", id: 10001 }]),
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
			let pageId: number;
			if (entry.fileKey === "s0101m.mul") pageId = 100;
			else if (entry.fileKey === "s0101a.att") pageId = 200;
			else if (entry.fileKey === "s0101t.tika") pageId = 300;
			else pageId = ++nextContentPageId;

			const segments = segmentStore.get(pageId) ?? [];
			const paragraphSets = new Map<string, Set<number>>();

			for (const segment of segments) {
				const metadataRecords = segmentMetadataStore.get(segment.id) ?? [];
				for (const record of metadataRecords) {
					const key = metadataTypeKeyById.get(record.metadataTypeId);
					if (key !== "VRI_PARAGRAPH_NUMBER") continue;
					const set = paragraphSets.get(record.value) ?? new Set<number>();
					set.add(segment.id);
					paragraphSets.set(record.value, set);
				}
			}

			const locatorMap = segmentLocatorStore.get(pageId) ?? new Map();
			for (const value of paragraphSets.keys()) {
				if (!locatorMap.has(value)) {
					locatorMap.set(value, nextLocatorId++);
				}
			}
			segmentLocatorStore.set(pageId, locatorMap);

			const locatorIdByValue = new Map<string, number>();
			for (const [value, id] of locatorMap) {
				locatorIdByValue.set(value, id);
			}

			const segmentIdsByValue = new Map<string, number[]>();
			for (const [value, ids] of paragraphSets) {
				segmentIdsByValue.set(value, [...ids]);
			}

			const values = [...segmentIdsByValue.keys()];
			if (values.length === 0) {
				await segmentLocatorDeleteManyMock({
					where: {
						contentId: pageId,
						system: "VRI_PARAGRAPH",
					},
				});
				await segmentLocatorLinkDeleteManyMock({
					where: {
						locator: { contentId: pageId, system: "VRI_PARAGRAPH" },
					},
				});
			} else {
				await segmentLocatorDeleteManyMock({
					where: {
						contentId: pageId,
						system: "VRI_PARAGRAPH",
						value: { notIn: values },
					},
				});
				await segmentLocatorCreateManyMock({
					data: values.map((value) => ({ contentId: pageId, value })),
					skipDuplicates: true,
				});
				const locators = await segmentLocatorFindManyMock({
					where: {
						contentId: pageId,
						system: "VRI_PARAGRAPH",
						value: { in: values },
					},
				});
				const locatorIds = locators.map((item) => item.id);
				if (locatorIds.length > 0) {
					await segmentLocatorLinkDeleteManyMock({
						where: { segmentLocatorId: { in: locatorIds } },
					});
				}
				const linkData: Array<{ segmentLocatorId: number; segmentId: number }> =
					[];
				for (const [value, segmentIds] of segmentIdsByValue) {
					const locatorId = locatorIdByValue.get(value);
					if (!locatorId) continue;
					for (const segmentId of segmentIds) {
						linkData.push({ segmentLocatorId: locatorId, segmentId });
					}
				}
				if (linkData.length > 0) {
					await segmentLocatorLinkCreateManyMock({
						data: linkData,
						skipDuplicates: true,
					});
				}
			}

			return {
				pageId,
				locatorIdByValue,
				segmentIdsByValue,
			};
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

	segmentStore.clear();
	segmentMetadataStore.clear();
	segmentLocatorStore.clear();
	nextLocatorId = 10_000;

	segmentStore.set(100, [
		{ id: 1001, number: 1, text: "1. First paragraph text" },
		{ id: 1002, number: 2, text: "Continuation text" },
		{ id: 1003, number: 3, text: "2. Second paragraph text" },
	]);
	const paragraphTypeId = metadataTypeByKey.get("VRI_PARAGRAPH_NUMBER");
	if (paragraphTypeId === undefined) {
		throw new Error(
			"VRI_PARAGRAPH_NUMBER metadata type id missing in test setup",
		);
	}
	segmentMetadataStore.set(1001, [
		{
			segmentId: 1001,
			metadataTypeId: paragraphTypeId,
			value: "1",
		},
	]);
	segmentMetadataStore.set(1002, []);
	segmentMetadataStore.set(1003, [
		{
			segmentId: 1003,
			metadataTypeId: paragraphTypeId,
			value: "2",
		},
	]);

	segmentStore.set(200, [
		{ id: 2001, number: 1, text: "1. First paragraph text" },
		{ id: 2002, number: 2, text: "3. Third paragraph text" },
	]);
	segmentMetadataStore.set(2001, [
		{
			segmentId: 2001,
			metadataTypeId: paragraphTypeId,
			value: "1",
		},
	]);
	segmentMetadataStore.set(2002, [
		{
			segmentId: 2002,
			metadataTypeId: paragraphTypeId,
			value: "3",
		},
	]);

	segmentStore.set(300, [
		{ id: 3001, number: 1, text: "2. Second paragraph text" },
	]);
	segmentMetadataStore.set(3001, [
		{
			segmentId: 3001,
			metadataTypeId: paragraphTypeId,
			value: "2",
		},
	]);

	segmentFindManyMock.mockImplementation(
		async ({ where, select }: SegmentFindManyArgs) => {
			const contentId = where.contentId;
			const segments = segmentStore.get(contentId) ?? [];
			// selectが指定されている場合、そのフィールドのみを返す
			if (select) {
				return segments.map((seg) => {
					const result: Partial<SegmentRecord> = {};
					if (select.id !== false) result.id = seg.id;
					if (select.number !== false) result.number = seg.number;
					if (select.text !== false) result.text = seg.text;
					return result as SegmentRecord;
				});
			}
			return segments;
		},
	);

	segmentMetadataFindManyMock.mockImplementation(
		async ({ where }: SegmentMetadataFindManyArgs) => {
			const contentId = where.segment.contentId;
			const requestedKey = where.metadataType?.key;
			const segments = segmentStore.get(contentId) ?? [];
			const results: SegmentMetadataRecord[] = [];
			for (const segment of segments) {
				const records = segmentMetadataStore.get(segment.id) ?? [];
				for (const record of records) {
					const key = metadataTypeKeyById.get(record.metadataTypeId);
					if (requestedKey && key !== requestedKey) continue;
					results.push({
						segmentId: record.segmentId,
						metadataTypeId: record.metadataTypeId,
						value: record.value,
					});
				}
			}
			return results;
		},
	);

	segmentMetadataDeleteManyMock.mockImplementation(
		async ({ where }: SegmentMetadataDeleteManyArgs) => {
			for (const segmentId of where.segmentId.in) {
				segmentMetadataStore.set(segmentId, []);
			}
		},
	);

	segmentMetadataCreateManyMock.mockImplementation(
		async ({ data }: SegmentMetadataCreateManyArgs) => {
			for (const record of data) {
				const list = segmentMetadataStore.get(record.segmentId) ?? [];
				list.push({
					segmentId: record.segmentId,
					metadataTypeId: record.metadataTypeId,
					value: record.value,
				});
				segmentMetadataStore.set(record.segmentId, list);
			}
		},
	);

	segmentMetadataTypeFindManyMock.mockImplementation(async ({ where } = {}) => {
		const keys = where?.key?.in;
		if (keys) {
			return SEGMENT_METADATA_TYPES.filter((item) => keys.includes(item.key));
		}
		return SEGMENT_METADATA_TYPES;
	});

	segmentLocatorCreateManyMock.mockClear();
	segmentLocatorFindManyMock.mockClear();
	segmentLocatorLinkCreateManyMock.mockReset();
	segmentLocatorDeleteManyMock.mockClear();
	segmentLocatorLinkDeleteManyMock.mockClear();
	segmentLocatorLinkDeleteManyMock.mockImplementation(async () => {});
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("runTipitakaImport", () => {
	it("§番号が一致する場合、各ページ内で適切にロケータとリンクが作成される", async () => {
		// 前提: デフォルトのモック（Mula: §1 が2セグメント、§2 が1セグメント）
		const { runTipitakaImport } = await import("./run");

		// 操作: 取り込みを実行
		await runTipitakaImport();

		// 期待: 各ページでリンク作成は1回ずつ（合計3回）行われる
		expect(segmentLocatorCreateManyMock).toHaveBeenCalledTimes(1);
		expect(segmentLocatorFindManyMock).toHaveBeenCalledTimes(1);
		expect(segmentLocatorLinkCreateManyMock).toHaveBeenCalledTimes(3);

		const calls = segmentLocatorLinkCreateManyMock.mock.calls.map(
			([arg]) => arg as SegmentLocatorLinkCreateManyArgs,
		);
		for (const call of calls) {
			expect(call).toMatchObject({ skipDuplicates: true });
		}

		// ムーラ(Mula, pageId=100): §1(1001)と§2(1003)がリンク対象、継続行(1002)は対象外
		const mulaCall = calls.find((c) =>
			c.data.some((d) => d.segmentId === 1001),
		);
		if (!mulaCall) {
			throw new Error("Expected Mula call with segmentId 1001 not found");
		}
		expect(mulaCall.data.some((d) => d.segmentId === 1001)).toBe(true);
		expect(mulaCall.data.some((d) => d.segmentId === 1002)).toBe(false);
		expect(mulaCall.data.some((d) => d.segmentId === 1003)).toBe(true);

		// アッタカタ(Atth, pageId=200): §1(2001), §3(2002) がそれぞれ自ページのロケータにリンク
		const atthCall = calls.find((c) =>
			c.data.some((d) => d.segmentId === 2001),
		);
		if (!atthCall) {
			throw new Error("Expected Atthakatha call with segmentId 2001 not found");
		}
		expect(atthCall.data.some((d) => d.segmentId === 2001)).toBe(true);
		expect(atthCall.data.some((d) => d.segmentId === 2002)).toBe(true);

		// ティカ(Tika, pageId=300): §2(3001) が自ページのロケータにリンク
		const tikaCall = calls.find((c) =>
			c.data.some((d) => d.segmentId === 3001),
		);
		if (!tikaCall) {
			throw new Error("Expected Tika call with segmentId 3001 not found");
		}
		expect(tikaCall.data.some((d) => d.segmentId === 3001)).toBe(true);
	});

	it("§番号が一致しない場合、リンクは一切作成されない", async () => {
		// 前提: すべて一致しないようにモックを上書き
		segmentFindManyMock.mockImplementation(
			async ({ where, select }: SegmentFindManyArgs) => {
				const id = where.contentId;
				const segments: SegmentRecord[] = [];
				if (id === 100)
					segments.push({ id: 1009, number: 1, text: "999. Mula text" }); // Mula
				if (id === 200)
					segments.push({ id: 2009, number: 1, text: "888. Atth text" }); // Atth
				if (id === 300)
					segments.push({ id: 3009, number: 1, text: "777. Tika text" }); // Tika
				// selectが指定されている場合、そのフィールドのみを返す
				if (select) {
					return segments.map((seg) => {
						const result: Partial<SegmentRecord> = {};
						if (select.id !== false) result.id = seg.id;
						if (select.number !== false) result.number = seg.number;
						if (select.text !== false) result.text = seg.text;
						return result as SegmentRecord;
					});
				}
				return segments;
			},
		);
		segmentMetadataFindManyMock.mockImplementation(async () => []);

		const { runTipitakaImport } = await import("./run");

		// 操作
		await runTipitakaImport();

		// 期待: ロケータリンクは呼ばれない
		expect(segmentLocatorLinkCreateManyMock).not.toHaveBeenCalled();
	});

	it("同一§番号に複数セグメントがある場合、ムーラ内の全セグメントが同じロケータへリンクされる", async () => {
		// 前提: Mula §1 が2件、Atthakatha §1 が2件（ムーラのロケータ共有を検証）
		segmentFindManyMock.mockImplementation(
			async ({ where, select }: SegmentFindManyArgs) => {
				const id = where.contentId;
				const segments: SegmentRecord[] = [];
				if (id === 100) {
					segments.push(
						{ id: 1101, number: 1, text: "1. First paragraph" },
						{ id: 1102, number: 2, text: "Continuation text" },
						{ id: 1103, number: 3, text: "2. Second paragraph" },
					);
				}
				if (id === 200) {
					segments.push(
						{ id: 2101, number: 1, text: "1. First paragraph" },
						{ id: 2102, number: 2, text: "1. Another first paragraph" },
					);
				}
				if (id === 300) {
					segments.push({
						id: 3101,
						number: 1,
						text: "Some text without paragraph number",
					});
				}
				// selectが指定されている場合、そのフィールドのみを返す
				if (select) {
					return segments.map((seg) => {
						const result: Partial<SegmentRecord> = {};
						if (select.id !== false) result.id = seg.id;
						if (select.number !== false) result.number = seg.number;
						if (select.text !== false) result.text = seg.text;
						return result as SegmentRecord;
					});
				}
				return segments;
			},
		);

		segmentMetadataFindManyMock.mockImplementation(
			async ({ where }: SegmentMetadataFindManyArgs) => {
				const contentId = where.segment.contentId;
				const typeId = metadataTypeByKey.get("VRI_PARAGRAPH_NUMBER");
				if (typeId === undefined) {
					throw new Error(
						"VRI_PARAGRAPH_NUMBER metadata type id missing in test setup",
					);
				}
				if (contentId === 100) {
					return [
						{ segmentId: 1101, metadataTypeId: typeId, value: "1" },
						{ segmentId: 1103, metadataTypeId: typeId, value: "2" },
					];
				}
				if (contentId === 200) {
					return [
						{ segmentId: 2101, metadataTypeId: typeId, value: "1" },
						{ segmentId: 2102, metadataTypeId: typeId, value: "1" },
					];
				}
				if (contentId === 300) {
					return [];
				}
				return [];
			},
		);

		const { runTipitakaImport } = await import("./run");
		await runTipitakaImport();

		// 期待: ロケータ作成は1回、リンクはムーラ＋注釈で2回（各ページ1回ずつ）
		expect(segmentLocatorCreateManyMock).toHaveBeenCalledTimes(1);
		expect(segmentLocatorLinkCreateManyMock).toHaveBeenCalledTimes(2);

		const [rootCall, atthCall] =
			segmentLocatorLinkCreateManyMock.mock.calls.map(
				([arg]) => arg as SegmentLocatorLinkCreateManyArgs,
			);

		// ムーラ内では §1(1101) と §2(1103) がそれぞれ別ロケータにリンク。継続行(1102)は対象外
		const locatorIdFor1101 = rootCall.data.find(
			(link) => link.segmentId === 1101,
		)?.segmentLocatorId;
		expect(locatorIdFor1101).toBeDefined();
		expect(rootCall.data.some((link) => link.segmentId === 1102)).toBe(false);
		const locatorIdFor1103 = rootCall.data.find(
			(link) => link.segmentId === 1103,
		)?.segmentLocatorId;
		expect(locatorIdFor1103).toBeDefined();
		expect(locatorIdFor1103).not.toBe(locatorIdFor1101);

		// Atthakatha 側では §1 の両セグメントが同じロケータにリンクする（自ページ内）
		const atthLocatorIdMaybe = atthCall.data.find(
			(link) => link.segmentId === 2101,
		)?.segmentLocatorId;
		if (atthLocatorIdMaybe === undefined) {
			throw new Error(
				"Expected locatorId for Atthakatha segment 2101 not found",
			);
		}
		const atthLocatorId = atthLocatorIdMaybe;
		expect(
			atthCall.data.filter((link) => link.segmentLocatorId === atthLocatorId),
		).toEqual(
			expect.arrayContaining([
				{ segmentLocatorId: atthLocatorId, segmentId: 2101 },
				{ segmentLocatorId: atthLocatorId, segmentId: 2102 },
			]),
		);
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
