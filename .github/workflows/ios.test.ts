// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const workflow = JSON.parse(
	execFileSync(
		"bun",
		[
			"-e",
			"console.log(JSON.stringify(Bun.YAML.parse(await Bun.file(process.argv[1]).text())))",
			fileURLToPath(new URL("./ios.yml", import.meta.url)),
		],
		{ encoding: "utf8" },
	),
);

it.each([
	["package.json", false],
	["bun.lock", false],
	["src/routes/index.tsx\nbun.lock", false],
	["patches/@lexical+list.patch", true],
	["apps/ios/App/Resources/LexicalModel.js", true],
	["src/app/[locale]/_components/editor/model.ts", true],
	["src/app/[locale]/_domain/get-x-post-id.ts", true],
	["tests/editor-matrix.mjs", true],
	["scripts/ios.sh", true],
	["scripts/ios.test.ts", true],
	[".github/workflows/ci.test.ts", true],
	[".github/workflows/ios.test.ts", true],
	[".github/workflows/ios.yml", true],
	["flake.lock", true],
	["nix/browser-schemas.nix", true],
])("iPhoneの変更範囲%sからMacでの検証要否を判断する", (paths, required) => {
	const scope = workflow.jobs.changes?.steps.find(
		(step: { id: string }) => step.id === "scope",
	);
	expect(scope).toBeDefined();
	const directory = mkdtempSync(join(tmpdir(), "evame-ios-scope-"));
	try {
		execFileSync(
			"bash",
			[
				"-e",
				"-c",
				`git() { while IFS= read -r path; do printf '%s\\0' "$path"; done <<< "$CHANGED_PATHS"; }
${scope.run}`,
			],
			{
				env: {
					...process.env,
					GITHUB_EVENT_NAME: "pull_request",
					BASE_SHA: "base",
					CHANGED_PATHS: paths,
					RUNNER_TEMP: directory,
					GITHUB_OUTPUT: join(directory, "outputs"),
				},
			},
		);
		expect(readFileSync(join(directory, "outputs"), "utf8")).toBe(
			`required=${required}\n`,
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

it("依存だけの更新でも生成物を検証し、Macの検証だけを省く", () => {
	const jobs = workflow.jobs;
	const verification = jobs.changes?.steps.find((step: { name: string }) =>
		step.name?.includes("generated"),
	);
	expect(verification?.run).toContain("bun install --frozen-lockfile");
	expect(verification?.run).toContain("bun apps/ios/LexicalModel/build.mjs");
	expect(verification?.run).toContain("git diff --exit-code -- apps/ios");
	expect(verification?.if).toBe("steps.scope.outputs.required == 'false'");
	expect(jobs.build.needs).toBe("changes");
	expect(jobs.build.if).toBe("needs.changes.outputs.required == 'true'");
	for (const event of ["pull_request", "push"]) {
		expect(workflow.on[event].paths).toContain("nix/**");
		expect(workflow.on[event].paths).toContain(".github/workflows/ios.test.ts");
	}
});

it.each([
	["workflow_dispatch", ""],
	["push", "0000000000000000000000000000000000000000"],
])(
	"手動実行または初回pushの%sでは全iPhoneテストを必須にする",
	(event, base) => {
		const directory = mkdtempSync(join(tmpdir(), "evame-ios-scope-"));
		try {
			const scope = workflow.jobs.changes.steps.find(
				(step: { id: string }) => step.id === "scope",
			);
			execFileSync(
				"bash",
				[
					"-e",
					"-c",
					`git() { exit 37; }
${scope.run}`,
				],
				{
					env: {
						...process.env,
						GITHUB_EVENT_NAME: event,
						BASE_SHA: base,
						RUNNER_TEMP: directory,
						GITHUB_OUTPUT: join(directory, "outputs"),
					},
				},
			);
			expect(readFileSync(join(directory, "outputs"), "utf8")).toBe(
				"required=true\n",
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	},
);

it("変更差分の取得に失敗したらMacテストを不要と判定しない", () => {
	const directory = mkdtempSync(join(tmpdir(), "evame-ios-scope-"));
	try {
		const scope = workflow.jobs.changes.steps.find(
			(step: { id: string }) => step.id === "scope",
		);
		expect(() =>
			execFileSync(
				"bash",
				[
					"-e",
					"-c",
					`git() { exit 37; }
${scope.run}`,
				],
				{
					env: {
						...process.env,
						GITHUB_EVENT_NAME: "pull_request",
						BASE_SHA: "base",
						RUNNER_TEMP: directory,
						GITHUB_OUTPUT: join(directory, "outputs"),
					},
				},
			),
		).toThrow();
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

it.each(["success", "failure", "cancelled", "skipped"])(
	"依存の生成物検証が%sなら、成功した場合だけMacのスキップを認める",
	(status) => {
		const run = () =>
			execFileSync("bash", ["-e", "-c", workflow.jobs.editor.steps[0].run], {
				env: {
					...process.env,
					CHANGES_RESULT: status,
					IOS_REQUIRED: "false",
					BUILD_RESULT: "skipped",
					TEST_RESULT: "skipped",
				},
			});
		if (status === "success") expect(run).not.toThrow();
		else expect(run).toThrow();
	},
);

it.each(["success", "failure", "cancelled"])(
	"Macテスト不要時に%sの実行結果が混じればゲートを通さない",
	(status) => {
		for (const result of ["BUILD_RESULT", "TEST_RESULT"]) {
			expect(() =>
				execFileSync("bash", ["-e", "-c", workflow.jobs.editor.steps[0].run], {
					env: {
						...process.env,
						CHANGES_RESULT: "success",
						IOS_REQUIRED: "false",
						BUILD_RESULT: "skipped",
						TEST_RESULT: "skipped",
						[result]: status,
					},
				}),
			).toThrow();
		}
	},
);

it.each(["", "unknown"])(
	"変更判定が未確定%sならiPhoneゲートを通さない",
	(required) => {
		expect(() =>
			execFileSync("bash", ["-e", "-c", workflow.jobs.editor.steps[0].run], {
				env: {
					...process.env,
					CHANGES_RESULT: "success",
					IOS_REQUIRED: required,
					BUILD_RESULT: "skipped",
					TEST_RESULT: "skipped",
				},
			}),
		).toThrow();
	},
);
