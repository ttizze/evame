// @vitest-environment node
import { execFile } from "node:child_process";
import {
	chmod,
	copyFile,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

let directory: string;
let environment: NodeJS.ProcessEnv;
const destination = "platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5";

beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "evame-ios-ci-"));
	for (const path of ["bin", "scripts", "apps/ios/EditorModel"])
		await mkdir(join(directory, path), { recursive: true });
	await copyFile(
		fileURLToPath(new URL("./ios.sh", import.meta.url)),
		join(directory, "scripts/ios.sh"),
	);
	await writeFile(join(directory, "apps/ios/Package.resolved"), "{}");
	const commands = {
		bun: `#!/bin/bash
printf "bun %s\n" "$*" >> "$CALLS"
if [[ "$1" == -e ]]; then exec "$REAL_BUN" "$@"; fi
`,
		xcodegen: `#!/bin/bash
printf "xcodegen %s\n" "$*" >> "$CALLS"
`,
		xcodebuild: `#!/bin/bash
if [[ "$1" == -version ]]; then printf "Xcode 26.6\nBuild version 17F113\n"; exit; fi
printf "xcodebuild %s\n" "$*" >> "$CALLS"
if [[ " $* " == *" build-for-testing "* ]]; then mkdir -p apps/ios/DerivedData/Build/Products; printf artifact > apps/ios/DerivedData/Build/Products/Evame.xctestrun; fi
exit "\${XCODE_STATUS:-0}"
`,
		xcrun: `#!/bin/bash
printf "xcrun %s\n" "$*" >> "$CALLS"
if [[ "$1" == simctl ]]; then exit "\${SIMCTL_STATUS:-0}"; fi
if [[ "$1" == xcresulttool ]]; then printf '{"passedTests":%s,"skippedTests":%s}\n' "\${PASSED_TESTS:-1}" "\${SKIPPED_TESTS:-0}"; fi
`,
	};
	for (const [name, content] of Object.entries(commands)) {
		await writeFile(join(directory, "bin", name), content);
		await chmod(join(directory, "bin", name), 0o755);
	}
	environment = {
		...process.env,
		IN_NIX_SHELL: "1",
		PATH: `${join(directory, "bin")}:${process.env.PATH}`,
		CALLS: join(directory, "calls"),
		REAL_BUN: (await promisify(execFile)("which", ["bun"])).stdout.trim(),
	};
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it("成果物を一度だけ生成し、Coreテストを実行してSimulator用にビルドする", async () => {
	await promisify(execFile)(
		"bash",
		["scripts/ios.sh", "build-for-testing", destination],
		{ cwd: directory, env: environment },
	);
	const calls = await readFile(join(directory, "calls"), "utf8");
	expect(calls).toContain("bun apps/ios/LexicalModel/build.mjs");
	expect(calls).toContain("bun tests/editor-matrix.mjs");
	expect(calls).toContain("bun apps/ios/EditorModel/build.mjs");
	expect(calls).toContain(
		"swift test --package-path apps/ios --disable-automatic-resolution",
	);
	expect(calls).toContain("build-for-testing");
	expect(calls).toContain("-parallel-testing-enabled NO");
	expect(calls).not.toContain("xcresulttool");
	expect(
		await readFile(
			join(directory, "apps/ios/DerivedData/Build/Products/Evame.xctestrun"),
			"utf8",
		),
	).toBe("artifact");
});

it("受け取った同一成果物だけで検証し、依存解決・生成・再ビルドをしない", async () => {
	const products = join(directory, "apps/ios/DerivedData/Build/Products");
	await mkdir(products, { recursive: true });
	await writeFile(join(products, "Evame.xctestrun"), "artifact");
	await promisify(execFile)(
		"bash",
		[
			"scripts/ios.sh",
			"test-without-building",
			destination,
			"-only-testing:NativeTests",
		],
		{ cwd: directory, env: environment },
	);
	const calls = await readFile(join(directory, "calls"), "utf8");
	expect(calls).toContain(
		"-xctestrun apps/ios/DerivedData/Build/Products/Evame.xctestrun",
	);
	expect(calls).toContain("test-without-building -only-testing:NativeTests");
	expect(calls).toContain("-parallel-testing-enabled NO");
	expect(calls).not.toContain("bun install");
	expect(calls).not.toContain("build.mjs");
	expect(calls).not.toContain("xcodegen");
	expect(calls).not.toContain("swift test");
	expect(calls).not.toContain("-project");
});

it.each(["build-for-testing", "test", "test-without-building"])(
	"CoreSimulatorの初回デバイス列挙が完了してから%sする",
	async (mode) => {
		const products = join(directory, "apps/ios/DerivedData/Build/Products");
		await mkdir(products, { recursive: true });
		await writeFile(join(products, "Evame.xctestrun"), "artifact");
		await promisify(execFile)("bash", ["scripts/ios.sh", mode, destination], {
			cwd: directory,
			env: environment,
		});
		const calls = (await readFile(join(directory, "calls"), "utf8")).split(
			"\n",
		);
		const simulator = calls.indexOf("xcrun simctl list devices available");
		expect(simulator).toBeGreaterThanOrEqual(0);
		expect(simulator).toBeLessThan(
			calls.findIndex((command) => command.startsWith("xcodebuild ")),
		);
	},
);

it("CoreSimulatorの初期化が失敗したらテストを開始せず失敗する", async () => {
	const products = join(directory, "apps/ios/DerivedData/Build/Products");
	await mkdir(products, { recursive: true });
	await writeFile(join(products, "Evame.xctestrun"), "artifact");
	await expect(
		promisify(execFile)(
			"bash",
			["scripts/ios.sh", "test-without-building", destination],
			{ cwd: directory, env: { ...environment, SIMCTL_STATUS: "70" } },
		),
	).rejects.toThrow();
	expect(await readFile(join(directory, "calls"), "utf8")).not.toContain(
		"xcodebuild ",
	);
});

it.each([
	{ PASSED_TESTS: "0" },
	{ SKIPPED_TESTS: "1" },
	{ XCODE_STATUS: "65" },
])("未実行・スキップ・失敗した結果を成功にしない: %j", async (result) => {
	const products = join(directory, "apps/ios/DerivedData/Build/Products");
	await mkdir(products, { recursive: true });
	await writeFile(join(products, "Evame.xctestrun"), "artifact");
	await expect(
		promisify(execFile)(
			"bash",
			["scripts/ios.sh", "test-without-building", destination],
			{ cwd: directory, env: { ...environment, ...result } },
		),
	).rejects.toThrow();
});

it("既存のtestコマンドでは生成・Core・Native・UIの全検証を残す", async () => {
	await promisify(execFile)("bash", ["scripts/ios.sh", "test", destination], {
		cwd: directory,
		env: environment,
	});
	const calls = await readFile(join(directory, "calls"), "utf8");
	expect(calls).toContain("swift test");
	expect(calls).toContain("-scheme EvameEditorPrototype");
	expect(calls).toContain(" test -resultBundlePath");
	expect(calls).not.toContain("-only-testing:");
	expect(calls).toContain("xcresulttool get test-results summary");
});

it.each([0, 2])(
	"受け取ったxctestrunが%d件なら別の成果物を選ばず失敗する",
	async (count) => {
		const products = join(directory, "apps/ios/DerivedData/Build/Products");
		await mkdir(products, { recursive: true });
		for (let index = 0; index < count; index++)
			await writeFile(join(products, `Evame${index}.xctestrun`), "artifact");
		await expect(
			promisify(execFile)(
				"bash",
				["scripts/ios.sh", "test-without-building", destination],
				{ cwd: directory, env: environment },
			),
		).rejects.toThrow();
		expect(
			await readFile(join(directory, "calls"), "utf8").catch(() => ""),
		).not.toContain("xcodebuild ");
	},
);
