import { spawnSync } from "node:child_process";
import {
	copyFile,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	distributeTests,
	mergeDurations,
	parseGitDiff,
	readDurationSnapshot,
	run,
	selectTests,
} from "./ci-tests.mjs";

const root = resolve("fixtures/ci-tests");
const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true })),
	);
});

async function fixture() {
	const directory = await mkdtemp(join(tmpdir(), "evame-ci-tests-"));
	directories.push(directory);
	return directory;
}

function contextFixture() {
	const modules = new Map<
		string,
		{
			id: string;
			file: string;
			importers: Set<{ id: string }>;
			transformResult: { code: string; deps: string[] } | null;
		}
	>();
	const project = {
		name: "node",
		vite: {
			environments: {
				ssr: {
					moduleGraph: {
						idToModuleMap: modules,
						getModulesByFile: (path: string) => {
							const module = modules.get(path);
							return module ? new Set([module]) : undefined;
						},
					},
				},
			},
		},
	};
	const specifications = ["src/first.test.ts", "src/second.test.ts"].map(
		(path) => ({ moduleId: resolve(root, path), project }),
	);
	for (const path of [
		"src/value.ts",
		...specifications.map((spec) => spec.moduleId),
	]) {
		const id = resolve(root, path);
		modules.set(id, {
			id,
			file: id,
			importers: new Set(),
			transformResult: { code: "export const value = 1", deps: [] },
		});
	}
	modules.get(resolve(root, "src/value.ts"))?.importers.add({
		id: specifications[0].moduleId,
	});
	return {
		config: { root, related: [] as string[] },
		projects: [project],
		globTestSpecifications: vi.fn(async () => specifications),
		getRelevantTestSpecifications: vi.fn(async () => [specifications[0]]),
		specifications,
		modules,
	};
}

describe("Git差分の読み取り", () => {
	it("空白や改行を含むパスとrename前後をNULで区切る", () => {
		expect(parseGitDiff("M\0src/a b.ts\0R100\0old.ts\0new\nname.ts\0")).toEqual(
			[
				{ status: "M", paths: ["src/a b.ts"] },
				{ status: "R100", paths: ["old.ts", "new\nname.ts"] },
			],
		);
	});
	it.each(["M\0a.ts", "R100\0old.ts\0", "X\0a.ts\0"])(
		"不完全または未知の差分 %s を拒否する",
		(output) => expect(() => parseGitDiff(output)).toThrow(),
	);
});

describe("PRの静的到達テスト選択", () => {
	it("baseのないmainではgraphを構築せず全件を返す", async () => {
		const context = contextFixture();
		expect((await selectTests(context, null)).specifications).toEqual(
			context.specifications,
		);
		expect(context.getRelevantTestSpecifications).not.toHaveBeenCalled();
	});
	it("通常のソース差分は公式APIへ絶対パスで渡す", async () => {
		const context = contextFixture();
		const result = await selectTests(context, [
			{ status: "M", paths: ["src/value.ts"] },
		]);
		expect(result.specifications).toEqual([context.specifications[0]]);
		expect(context.config.related).toEqual([resolve(root, "src/value.ts")]);
		expect(context.getRelevantTestSpecifications).toHaveBeenCalledOnce();
	});
	it.each([
		["D", "src/value.ts"],
		["R100", "src/value.ts"],
		["M", "vitest.config.ts"],
		["M", "bun.lock"],
		["M", "flake.nix"],
		["M", "src/db/schema.ts"],
		["M", "src/app/example/_db/queries.ts"],
		["M", "src/drizzle/0001.sql"],
		["M", "src/tests/database-setup.ts"],
		["M", "src/fixture.json"],
		["M", "scripts/check.mjs"],
		["M", "tsconfig.json"],
	])("危険な差分 %s %s は全件へ戻す", async (status, path) => {
		const context = contextFixture();
		expect(
			(await selectTests(context, [{ status, paths: [path] }])).specifications,
		).toEqual(context.specifications);
		expect(context.getRelevantTestSpecifications).not.toHaveBeenCalled();
	});
});

describe("静的graphの安全側への補完", () => {
	it("公式APIの関連テストがinventoryと一致しなければ全件へ戻す", async () => {
		const context = contextFixture();
		context.getRelevantTestSpecifications.mockResolvedValue([
			{
				...context.specifications[0],
				moduleId: resolve(root, "unknown.test.ts"),
			},
		]);
		expect(
			(await selectTests(context, [{ status: "M", paths: ["src/value.ts"] }]))
				.specifications,
		).toEqual(context.specifications);
	});
	it("blockという名前だけではlock変更と誤判定しない", async () => {
		const context = contextFixture();
		const module = context.modules.get(resolve(root, "src/value.ts"));
		if (module)
			context.modules.set(resolve(root, "src/block.ts"), {
				...module,
				id: resolve(root, "src/block.ts"),
				file: resolve(root, "src/block.ts"),
			});
		expect(
			(await selectTests(context, [{ status: "M", paths: ["src/block.ts"] }]))
				.reason,
		).toContain("related:");
	});
	it("projectのgraphがなければ全件へ戻す", async () => {
		const context = contextFixture();
		Reflect.deleteProperty(
			context.projects[0].vite.environments.ssr,
			"moduleGraph",
		);
		expect(
			(await selectTests(context, [{ status: "M", paths: ["src/value.ts"] }]))
				.reason,
		).toContain("full:");
	});
	it("inventory内のテストがgraphから欠けていれば全件へ戻す", async () => {
		const context = contextFixture();
		context.modules.delete(context.specifications[1].moduleId);
		expect(
			(await selectTests(context, [{ status: "M", paths: ["src/value.ts"] }]))
				.reason,
		).toContain("full:");
	});
	it("FSを読む補助モジュールの間接importerも実行する", async () => {
		const context = contextFixture();
		const helper = resolve(root, "src/helper.ts");
		const middle = resolve(root, "src/middle.ts");
		context.modules.set(helper, {
			id: helper,
			file: helper,
			importers: new Set([{ id: middle }]),
			transformResult: { code: "readFile(path)", deps: ["node:fs/promises"] },
		});
		context.modules.set(middle, {
			id: middle,
			file: middle,
			importers: new Set([{ id: context.specifications[1].moduleId }]),
			transformResult: { code: "helper()", deps: [helper] },
		});
		expect(
			(await selectTests(context, [{ status: "M", paths: ["src/value.ts"] }]))
				.specifications,
		).toEqual(context.specifications);
	});
	it.each([
		{ changes: [] },
		{ changes: [{ status: "M", paths: ["src/unknown.ts"] }] },
	])("空差分や未知のファイルをゼロ件成功にしない", async ({ changes }) => {
		const context = contextFixture();
		expect((await selectTests(context, changes)).specifications).toEqual(
			context.specifications,
		);
	});
	it("差分の一部だけがgraph既知でも全件へ戻す", async () => {
		const context = contextFixture();
		expect(
			(
				await selectTests(context, [
					{ status: "M", paths: ["src/value.ts", "src/unknown.ts"] },
				])
			).specifications,
		).toEqual(context.specifications);
	});
	it.each(["zero", "error", "untransformed"])(
		"graphが %s なら全件へ戻す",
		async (condition) => {
			const context = contextFixture();
			if (condition === "zero") {
				context.getRelevantTestSpecifications.mockResolvedValue([]);
			} else if (condition === "error") {
				context.getRelevantTestSpecifications.mockRejectedValue(
					new Error("graph"),
				);
			} else {
				const module = context.modules.get(resolve(root, "src/value.ts"));
				if (module) module.transformResult = null;
			}
			const result = await selectTests(context, [
				{ status: "M", paths: ["src/value.ts"] },
			]);
			expect(result.specifications).toEqual(context.specifications);
			expect(result.reason).toContain("full");
		},
	);
	it("全件inventoryが空なら失敗する", async () => {
		const context = contextFixture();
		context.globTestSpecifications.mockResolvedValue([]);
		await expect(selectTests(context, null)).rejects.toThrow();
	});
	it.each(["node:fs", "fs/promises", "node:child_process", "node:module"])(
		"%s を読むテストは無関係な差分でも必ず全テストを実行する",
		async (dependency) => {
			const context = contextFixture();
			const module = context.modules.get(context.specifications[1].moduleId);
			module?.transformResult?.deps.push(dependency);
			expect(
				(await selectTests(context, [{ status: "M", paths: ["src/value.ts"] }]))
					.specifications,
			).toEqual(context.specifications);
		},
	);
	it.each([
		"Bun.file(path)",
		"__vite_ssr_dynamic_import__(path)",
		"require(path)",
	])("graphで追えない %s のテストも常時含める", async (code) => {
		const context = contextFixture();
		const module = context.modules.get(context.specifications[1].moduleId);
		if (module?.transformResult) module.transformResult.code = code;
		expect(
			(await selectTests(context, [{ status: "M", paths: ["src/value.ts"] }]))
				.specifications,
		).toEqual(context.specifications);
	});
	it("FS依存を持つ変更ファイルは全件へ戻す", async () => {
		const context = contextFixture();
		context.modules
			.get(resolve(root, "src/value.ts"))
			?.transformResult?.deps.push("node:fs");
		expect(
			(await selectTests(context, [{ status: "M", paths: ["src/value.ts"] }]))
				.reason,
		).toContain("full");
	});
});

describe("前回実測時間による貪欲分配", () => {
	const files = ["a", "b", "c", "d", "e"];
	it("時間の長いファイルから現在最短のシャードへ割り当てる", () => {
		const durations = new Map(
			files.map((file, index) => [file, [100, 80, 20, 10, 10][index]]),
		);
		expect(
			distributeTests(files, 4, durations).map((shard) => shard.duration),
		).toEqual([100, 80, 20, 20]);
	});
	it("未計測も入力順に依存せず全件一度だけ割り当てる", () => {
		for (const durations of [new Map(), new Map([["a", 100]])]) {
			const shards = distributeTests(files, 4, durations);
			expect(shards.flatMap((shard) => shard.files).sort()).toEqual(files);
			expect(distributeTests([...files].reverse(), 4, durations)).toEqual(
				shards,
			);
		}
	});
	it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, "100", null])(
		"壊れた時間 %s はsnapshot全体を無視して均等配分する",
		(duration) => {
			expect(
				distributeTests(
					files,
					4,
					new Map([
						["a", duration],
						["b", 80],
					]),
				),
			).toEqual(distributeTests(files, 4, new Map()));
		},
	);
	it("project名が違う同一パスも別々に一度だけ割り当てる", () => {
		const keys = ["node:src/shared.test.ts", "dom:src/shared.test.ts"];
		expect(
			distributeTests(keys, 4, new Map())
				.flatMap((shard) => shard.files)
				.sort(),
		).toEqual([...keys].sort());
	});
	it.each([0, -1, 1.5, Number.NaN])("不正な分割数 %s を拒否する", (count) => {
		expect(() => distributeTests(files, count, new Map())).toThrow();
	});
});

function runnerFixture() {
	const context = contextFixture();
	return {
		...context,
		standalone: vi.fn(async () => {}),
		runTestSpecifications: vi.fn(async (specifications: unknown[]) => ({
			testModules: specifications.map(() => ({
				state: (): string => "passed",
			})),
			unhandledErrors: [] as Error[],
		})),
		state: { getUnhandledErrors: () => [] },
		cache: {
			getFileTestResults: vi.fn(() => ({ duration: 10, failed: false })),
		},
		close: vi.fn(async () => {}),
	};
}

describe("共通snapshotとシャード出力", () => {
	it.each(["正常", "版不一致", "snapshot不一致"])(
		"node_modulesがないmergeでも%sの整合性を検証する",
		async (condition) => {
			const directory = await fixture();
			const scripts = join(directory, "scripts");
			await mkdir(scripts);
			await copyFile("scripts/ci-tests.mjs", join(scripts, "ci-tests.mjs"));
			await copyFile("package.json", join(directory, "package.json"));
			const input = join(directory, "input.json");
			const outputs: string[] = [];
			for (let index = 1; index <= 4; index++) {
				const output = join(directory, `shard-${index}.json`);
				outputs.push(output);
				await run(
					{
						input,
						output,
						cacheDir: join(directory, `cache-${index}`),
						base: null,
						shard: { index, count: 4 },
					},
					async () => runnerFixture(),
				);
			}
			if (condition === "版不一致") {
				const document = JSON.parse(await readFile(outputs[0], "utf8"));
				document.version = "old";
				await writeFile(outputs[0], JSON.stringify(document));
			}
			if (condition === "snapshot不一致") {
				await writeFile(
					input,
					JSON.stringify({
						version: "5.0.3",
						results: [["node:previous.test.ts", { duration: 1 }]],
					}),
				);
			}
			const original = await readFile(input, "utf8").catch(() => null);
			const result = spawnSync(
				"bun",
				[join(scripts, "ci-tests.mjs"), "merge", ...outputs],
				{
					cwd: directory,
					encoding: "utf8",
					timeout: 10000,
					env: { ...process.env, CI_TEST_DURATIONS_INPUT: input },
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.stderr).not.toContain("Cannot find");
			expect(result.status, result.stdout + result.stderr).toBe(
				condition === "正常" ? 0 : 1,
			);
			if (condition === "正常") {
				expect((await readDurationSnapshot(input)).size).toBe(2);
			} else {
				expect(await readFile(input, "utf8").catch(() => null)).toBe(original);
			}
		},
	);
	it("Bunから起動してもテスト環境を初期化してNodeの隔離workerで実行する", async () => {
		const directory = await fixture();
		await writeFile(
			join(directory, "vitest.config.mjs"),
			'export default { test: { globals: true, include: ["runtime.test.js"] } };',
		);
		await writeFile(
			join(directory, "runtime.test.js"),
			'test("runtime", () => { expect(process.versions.bun).toBeUndefined(); expect(process.versions.node).toBeTruthy(); expect(process.env.NODE_ENV).toBe("test"); expect(process.env.TEST).toBe("true"); expect(process.env.VITEST).toBe("true"); });',
		);
		const output = join(directory, "durations.json");
		const environment = { ...process.env };
		delete environment.NODE_ENV;
		delete environment.TEST;
		delete environment.VITEST;
		const result = spawnSync(
			"bun",
			[resolve("scripts/ci-tests.mjs"), "--shard", "1/1"],
			{
				cwd: directory,
				encoding: "utf8",
				timeout: 30000,
				env: {
					...environment,
					CI_TEST_BASE: "",
					CI_TEST_DURATIONS_INPUT: join(directory, "missing.json"),
					CI_TEST_DURATIONS_OUTPUT: output,
					CI_TEST_CACHE_DIR: join(directory, "cache"),
				},
			},
		);
		expect(result.error).toBeUndefined();
		expect(result.status, result.stdout + result.stderr).toBe(0);
		expect((await readDurationSnapshot(output)).size).toBe(1);
	}, 40000);
	it.each([
		"{",
		JSON.stringify({ version: "old", results: [] }),
		JSON.stringify({ version: "5.0.3", results: [["a", { duration: -1 }]] }),
	])("壊れたcache %s からは全件を安全に配分する", async (text) => {
		const directory = await fixture();
		const path = join(directory, "input.json");
		await writeFile(path, text);
		expect(await readDurationSnapshot(path)).toEqual(new Map());
	});
	it("cacheがなければ未計測として全件を配分する", async () => {
		expect(
			await readDurationSnapshot(join(await fixture(), "missing.json")),
		).toEqual(new Map());
	});
	it("入力は変更せず各shardの今回実測だけを別ファイルへ出力してmergeする", async () => {
		const directory = await fixture();
		const input = join(directory, "input.json");
		const original = JSON.stringify({
			version: "5.0.3",
			results: [["node:src/previous.test.ts", { duration: 30, failed: false }]],
		});
		await writeFile(input, original);
		const outputs: string[] = [];
		for (let index = 1; index <= 4; index++) {
			const output = join(directory, `shard-${index}.json`);
			outputs.push(output);
			const context = runnerFixture();
			const createContext = vi.fn(async () => context);
			await run(
				{
					input,
					output,
					cacheDir: join(directory, `cache-${index}`),
					base: null,
					shard: { index, count: 4 },
				},
				createContext,
			);
			expect(createContext).toHaveBeenCalledWith(
				{ watch: false, run: true, isolate: true },
				{ cacheDir: join(directory, `cache-${index}`) },
			);
			expect(context.close).toHaveBeenCalledOnce();
			if (index > 2)
				expect(context.runTestSpecifications).not.toHaveBeenCalled();
		}
		expect(await readFile(input, "utf8")).toBe(original);
		const output = join(directory, "merged.json");
		await mergeDurations(input, outputs.reverse(), output);
		expect(await readDurationSnapshot(output)).toEqual(
			new Map([
				["node:src/first.test.ts", 10],
				["node:src/previous.test.ts", 30],
				["node:src/second.test.ts", 10],
			]),
		);
		await expect(
			mergeDurations(input, outputs.slice(1), output),
		).rejects.toThrow();
		await expect(
			mergeDurations(input, [outputs[0], ...outputs.slice(0, 3)], output),
		).rejects.toThrow();
		await writeFile(input, JSON.stringify({ version: "5.0.3", results: [] }));
		await expect(mergeDurations(input, outputs, output)).rejects.toThrow(
			/snapshot/,
		);
	});
	it.each([
		"missing-duration",
		"failed-duration",
		"duplicate-file",
		"missing-plan",
	])("不完全な出力 %s はmergeせず既存snapshotを残す", async (condition) => {
		const directory = await fixture();
		const input = join(directory, "input.json");
		const output = join(directory, "shard.json");
		await writeFile(input, JSON.stringify({ version: "5.0.3", results: [] }));
		const original = await readFile(input, "utf8");
		await run(
			{
				input,
				output,
				cacheDir: join(directory, "cache"),
				base: null,
				shard: { index: 1, count: 1 },
			},
			async () => runnerFixture(),
		);
		const document = JSON.parse(await readFile(output, "utf8"));
		if (condition === "missing-duration") document.results.pop();
		if (condition === "failed-duration") document.results[0][1].failed = true;
		if (condition === "duplicate-file")
			document.ci.files.push(document.ci.files[0]);
		if (condition === "missing-plan") delete document.ci.plan;
		await writeFile(output, JSON.stringify(document));
		await expect(mergeDurations(input, [output], input)).rejects.toThrow();
		expect(await readFile(input, "utf8")).toBe(original);
	});
	it.each([
		"failed",
		"pending",
		"queued",
		"unhandled",
		"missing",
		"throw",
		"cache",
	])("Vitestの %s を成功にせず出力も作らない", async (condition) => {
		const directory = await fixture();
		const context = runnerFixture();
		if (condition === "throw")
			context.runTestSpecifications.mockRejectedValue(
				new Error("worker failed"),
			);
		else if (condition === "cache")
			context.cache.getFileTestResults.mockReturnValue({
				duration: 0,
				failed: true,
			});
		else
			context.runTestSpecifications.mockResolvedValue({
				testModules:
					condition === "missing"
						? []
						: [{ state: () => condition }, { state: () => "passed" }],
				unhandledErrors:
					condition === "unhandled" ? [new Error("setup failed")] : [],
			});
		const output = join(directory, "output.json");
		await expect(
			run(
				{
					input: join(directory, "missing.json"),
					output,
					cacheDir: join(directory, "cache"),
					base: null,
					shard: { index: 1, count: 1 },
				},
				async () => context,
			),
		).rejects.toThrow();
		expect(context.close).toHaveBeenCalledOnce();
		await expect(readFile(output)).rejects.toThrow();
	});
	it("入力と出力の同一パスを拒否する", async () => {
		const input = join(await fixture(), "input.json");
		await expect(
			run({ input, output: input, shard: { index: 1, count: 4 } }, async () =>
				runnerFixture(),
			),
		).rejects.toThrow(/immutable/);
	});
});
