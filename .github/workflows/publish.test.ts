// @vitest-environment node
// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub Actionsの式をそのまま検証する。
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";

const ciPath = fileURLToPath(new URL("./ci.yaml", import.meta.url));
const publishPath = fileURLToPath(new URL("./publish.yaml", import.meta.url));
const [ci, publish] = JSON.parse(
	execFileSync(
		"bun",
		[
			"-e",
			`console.log(JSON.stringify(await Promise.all(process.argv.slice(1).map(async path => Bun.YAML.parse(await Bun.file(path).text())))))`,
			ciPath,
			publishPath,
		],
		{ encoding: "utf8" },
	),
);

it("CIは外部サービスの秘密値を受け取らず、SQLiteとローカルR2で検証する", () => {
	const source = readFileSync(ciPath, "utf8");
	expect(source.match(/secrets\.(?!GITHUB_TOKEN\b)[A-Z_]+/g)).toBeNull();
	expect(source).not.toMatch(/deploy:workers|preview:workers|db:prod:|fetch\(/);
	expect(ci.jobs.preview).toBeUndefined();
	expect(ci.jobs.build.env.GOOGLE_ANALYTICS_ID).toBe("G-0000000000");
	const build = ci.jobs.build.steps.find((step: { name: string }) =>
		step.name?.startsWith("Build Astro"),
	);
	expect(build.run.trim()).toBe("nix develop --command bun run build");
	expect(build.env.SENTRY_AUTH_TOKEN).toBe("");
	for (const job of [
		ci.jobs.lint,
		ci.jobs.typecheck,
		ci.jobs.test,
		ci.jobs.build,
		ci.jobs.browser,
	]) {
		expect(job.env.SENTRY_DSN).toBe("");
		expect(job.env.VITE_SENTRY_DSN).toBe("");
	}
	expect(JSON.stringify(ci.jobs.build)).toContain(
		"scripts/check-reader-connected.mjs",
	);
	expect(JSON.stringify(ci.jobs.build)).not.toContain(
		"CONNECTED_PREVIEW_ORIGIN",
	);
});

it("CI成功後に環境別の順序でDBを更新しCloudflareに公開する", () => {
	expect(publish.on.workflow_run).toEqual({
		workflows: ["CI"],
		types: ["completed"],
	});
	expect(ci["run-name"]).toBe("CI ${{ github.sha }}");
	const source = readFileSync(publishPath, "utf8");
	expect(source).not.toMatch(/CLOUDFLARE_API_TOKEN|deploy:workers/);
	expect(publish.concurrency.queue).toBe("max");
	expect(publish.jobs.migrate.needs).toBe("revision");
	expect(publish.jobs.migrate.environment.name).toBe("preview");
	expect(source).not.toContain("db:prod:migrate");
	expect(publish.jobs.production.needs).toEqual(["revision", "signal"]);
	expect(publish.jobs.signal.needs).toEqual(["revision", "migrate"]);
	expect(publish.jobs.signal.permissions).toEqual({ contents: "write" });
	expect(publish.jobs.signal.steps[0].with.script).toContain(
		"heads/cf-publish/",
	);
	expect(publish.jobs.preview.needs).toEqual(["revision", "signal"]);
	const preview = publish.jobs.preview;
	expect(preview.env.CONNECTED_PREVIEW_SIGNAL).toBe(
		"${{ needs.signal.outputs.sha }}",
	);
	expect(preview.steps[0].with.ref).toBe("${{ needs.revision.outputs.sha }}");
	const wait = preview.steps.findIndex((step: { run: string }) =>
		step.run?.includes("readPreviewSignal"),
	);
	const connected = preview.steps.findIndex((step: { run: string }) =>
		step.run?.includes("scripts/check-reader-connected.mjs"),
	);
	expect(wait).toBeGreaterThan(0);
	expect(connected).toBeGreaterThan(wait);
	expect(preview.steps[connected].run).toContain('--user "$(id -u):$(id -g)"');
	expect(preview.steps.at(-1).if).toBe("always()");
});

it.each([
	{ previous: null, previousRun: 0, previousAttempt: 0, older: false },
	{ previous: "previous", previousRun: 348, previousAttempt: 1, older: false },
	{ previous: "previous", previousRun: 350, previousAttempt: 2, older: false },
	{ previous: "previous", previousRun: 351, previousAttempt: 1, older: true },
	{ previous: "previous", previousRun: 350, previousAttempt: 3, older: true },
])(
	"先端のCIが$previousRunの試行$previousAttemptなら古いCIだけ通知を見送る",
	async ({ previous, previousRun, previousAttempt, older }) => {
		const git = {
			getRef: vi.fn(async ({ ref }: { ref: string }) => {
				if (ref === "heads/t3/faster-ci")
					return { data: { object: { sha: "source" } } };
				if (ref !== "heads/cf-publish/pr-1175")
					throw new Error(`Unexpected ref: ${ref}`);
				if (previous === null)
					throw Object.assign(new Error("Missing ref"), { status: 404 });
				return { data: { object: { sha: previous } } };
			}),
			getCommit: vi.fn(async () => ({
				data: {
					message: JSON.stringify({
						ciRunNumber: previousRun,
						ciRunAttempt: previousAttempt,
					}),
				},
			})),
			createTree: vi.fn(async () => ({ data: { sha: "tree" } })),
			createCommit: vi.fn(async () => ({ data: { sha: "signal" } })),
			createRef: vi.fn(),
			updateRef: vi.fn(),
		};
		const step = publish.jobs.signal.steps[0];
		const core = { notice: vi.fn(), setOutput: vi.fn() };
		await new Function(
			"github",
			"context",
			"process",
			"core",
			`return (async () => {${step.with.script}\n})()`,
		)(
			{ rest: { git } },
			{
				repo: { owner: "ttizze", repo: "evame" },
				payload: {
					workflow_run: {
						id: 11750,
						run_number: 350,
						run_attempt: 2,
						head_branch: "t3/faster-ci",
						head_sha: "source",
					},
				},
				runId: 11800,
			},
			{ env: { PR_NUMBER: "1175", PUBLISH_PROOF_ATTEMPT: "3" } },
			core,
		);
		if (older) {
			expect(git.createTree).not.toHaveBeenCalled();
			expect(git.createRef).not.toHaveBeenCalled();
			expect(git.updateRef).not.toHaveBeenCalled();
			expect(core.setOutput).not.toHaveBeenCalled();
			return;
		}
		expect(core.setOutput).toHaveBeenCalledExactlyOnceWith("sha", "signal");
		expect(git.createTree).toHaveBeenCalledWith({
			owner: "ttizze",
			repo: "evame",
			tree: [
				{
					path: "wrangler.jsonc",
					mode: "100644",
					type: "blob",
					content: '{"name":"evame-start"}\n',
				},
			],
		});
		expect(git.createCommit).toHaveBeenCalledWith(
			expect.objectContaining({
				message:
					'{"ciRunId":11750,"ciRunNumber":350,"ciRunAttempt":2,"publishRunId":11800,"publishRunAttempt":3}',
				tree: "tree",
				parents: previous === null ? [] : [previous],
			}),
		);
		if (previous === null) {
			expect(git.createRef).toHaveBeenCalledWith(
				expect.objectContaining({
					ref: "refs/heads/cf-publish/pr-1175",
					sha: "signal",
				}),
			);
			expect(git.updateRef).not.toHaveBeenCalled();
		} else {
			expect(git.updateRef).toHaveBeenCalledWith(
				expect.objectContaining({
					ref: "heads/cf-publish/pr-1175",
					sha: "signal",
					force: false,
				}),
			);
			expect(git.createRef).not.toHaveBeenCalled();
		}
	},
);
