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

it("CIの成功後にDBを更新し、公開専用ブランチでCloudflareを起動する", () => {
	expect(publish.on.workflow_run).toEqual({
		workflows: ["CI"],
		types: ["completed"],
	});
	expect(ci["run-name"]).toBe("CI ${{ github.sha }}");
	const source = readFileSync(publishPath, "utf8");
	expect(source).not.toMatch(/CLOUDFLARE_API_TOKEN|deploy:workers/);
	expect(publish.jobs.migrate.needs).toBe("revision");
	expect(publish.jobs.signal.needs).toEqual(["revision", "migrate"]);
	expect(publish.jobs.signal.permissions).toEqual({ contents: "write" });
	expect(publish.jobs.signal.steps[0].with.script).toContain(
		"heads/cf-publish/",
	);
	expect(publish.jobs.preview.needs).toEqual(["revision", "signal"]);
	const preview = publish.jobs.preview;
	expect(preview.env.CONNECTED_PREVIEW_SHA).toBe(
		"${{ needs.revision.outputs.sha }}",
	);
	expect(preview.steps[0].with.ref).toBe(preview.env.CONNECTED_PREVIEW_SHA);
	const wait = preview.steps.findIndex((step: { run: string }) =>
		step.run?.includes("evame-preview-commit.txt"),
	);
	const connected = preview.steps.findIndex((step: { run: string }) =>
		step.run?.includes("scripts/check-reader-connected.mjs"),
	);
	expect(wait).toBeGreaterThan(0);
	expect(connected).toBeGreaterThan(wait);
	expect(preview.steps[connected].run).toContain('--user "$(id -u):$(id -g)"');
	expect(preview.steps.at(-1).if).toBe("always()");
});

it.each([null, "previous"])(
	"公開ブランチの先端が%sの場合にWorker名だけを持つコミットで公開を通知する",
	async (previous) => {
		const git = {
			getRef: vi.fn(async ({ ref }: { ref: string }) => {
				if (ref === "heads/t3/faster-ci")
					return { data: { object: { sha: "source" } } };
				if (previous === null)
					throw Object.assign(new Error("Missing ref"), { status: 404 });
				return { data: { object: { sha: previous } } };
			}),
			createTree: vi.fn(async () => ({ data: { sha: "tree" } })),
			createCommit: vi.fn(async () => ({ data: { sha: "signal" } })),
			createRef: vi.fn(),
			updateRef: vi.fn(),
		};
		const step = publish.jobs.signal.steps[0];
		await new Function(
			"github",
			"context",
			"process",
			`return (async () => {${step.with.script}\n})()`,
		)(
			{ rest: { git } },
			{
				repo: { owner: "ttizze", repo: "evame" },
				payload: {
					workflow_run: {
						id: 11750,
						head_branch: "t3/faster-ci",
						head_sha: "source",
					},
				},
				runId: 11800,
			},
			{ env: { PR_NUMBER: "1175" } },
		);
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
				message: '{"ciRunId":11750,"publishRunId":11800}',
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
