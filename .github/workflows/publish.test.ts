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

it("公開はCI完了から起動し、検証したソースを同じrunの成果物から受け取る", () => {
	expect(publish).toBeDefined();
	expect(publish.on).toEqual({
		workflow_run: { workflows: ["CI"], types: ["completed"] },
	});
	expect(publish.permissions).toEqual({ contents: "read", actions: "read" });
	expect(publish.jobs.revision.permissions).toEqual({
		contents: "read",
		actions: "read",
		"pull-requests": "read",
	});
	expect(publish.jobs.preview.permissions["pull-requests"]).toBe("read");
	const source = ci.jobs.build.steps.find(
		(step: { name: string }) => step.name === "Record verified source revision",
	);
	expect(source.run).toContain(
		'git rev-parse HEAD > "$RUNNER_TEMP/source.sha"',
	);
	const download = publish.jobs.revision.steps.find((step: { uses: string }) =>
		step.uses?.startsWith("actions/download-artifact@"),
	);
	expect(download.with.name).toBe("verified-source");
	expect(download.with["run-id"]).toBe("${{ github.event.workflow_run.id }}");
	for (const job of [publish.jobs.production, publish.jobs.preview]) {
		expect(job.needs).toBe("revision");
		const checkout = job.steps.find((step: { uses: string }) =>
			step.uses?.startsWith("actions/checkout@"),
		);
		expect(checkout.with.ref).toBe("${{ needs.revision.outputs.sha }}");
		expect(checkout.with["persist-credentials"]).toBe(false);
		expect(job.concurrency["cancel-in-progress"]).toBe(false);
	}
});

it("本番用SentryビルドとDB更新は公開側だけで行い、隔離Previewの接続検証も維持する", () => {
	expect(publish).toBeDefined();
	const production = publish.jobs.production;
	const build = production.steps.findIndex(
		(step: { name: string }) => step.name === "Build production Workers",
	);
	const migrate = production.steps.findIndex(
		(step: { name: string }) => step.name === "Migrate production database",
	);
	const deploy = production.steps.findIndex(
		(step: { name: string }) => step.name === "Deploy Cloudflare Workers",
	);
	expect(build).toBeGreaterThan(-1);
	expect(migrate).toBeGreaterThan(build);
	expect(deploy).toBeGreaterThan(migrate);
	expect(production.steps[build].env.SENTRY_AUTH_TOKEN).toBe(
		"${{ secrets.SENTRY_AUTH_TOKEN }}",
	);
	const preview = publish.jobs.preview;
	expect(preview.environment.name).toBe("preview");
	expect(preview.env.PR_NUMBER).toBe("${{ needs.revision.outputs.pr }}");
	expect(JSON.stringify(preview)).toContain("preview:workers");
	expect(JSON.stringify(preview)).toContain(
		"scripts/check-reader-connected.mjs",
	);
	expect(
		preview.steps.find(
			(step: { name: string }) =>
				step.name === "Verify connected publication on Cloudflare Preview",
		).run,
	).toContain('--user "$(id -u):$(id -g)"');
	expect(
		preview.steps.find(
			(step: { name: string }) =>
				step.name === "Upload connected publication verification",
		).if,
	).toBe("always()");
});

const head = "1".repeat(40);
const base = "2".repeat(40);
const merge = "3".repeat(40);
const newer = "4".repeat(40);

async function resolvePublication({
	event = "pull_request",
	conclusion = "success",
	repository = "ttizze/evame",
	source = merge,
	currentHead = head,
	state = "open",
	parents = [base, head],
	authorType = "User",
	authorPermission = "write",
	permissionStatus = 0,
} = {}) {
	expect(publish).toBeDefined();
	const script = publish.jobs.revision.steps.find(
		(step: { id: string }) => step.id === "revision",
	).with.script;
	const outputs: Record<string, string> = {};
	const github = {
		rest: {
			pulls: {
				get: vi.fn(async () => ({
					data: {
						state,
						user: { login: "contributor", type: authorType },
						head: { sha: currentHead, repo: { full_name: repository } },
						base: { ref: "main" },
					},
				})),
			},
			repos: {
				getCollaboratorPermissionLevel: vi.fn(async () => {
					if (permissionStatus)
						throw Object.assign(new Error("Permission lookup failed"), {
							status: permissionStatus,
						});
					return { data: { permission: authorPermission } };
				}),
				getCommit: vi.fn(async () => ({
					data: { parents: parents.map((sha) => ({ sha })) },
				})),
				getBranch: vi.fn(async () => ({
					data: { commit: { sha: currentHead } },
				})),
			},
		},
	};
	await new Function(
		"context",
		"github",
		"core",
		"require",
		`return (async () => {${script}\n})()`,
	)(
		{
			repo: { owner: "ttizze", repo: "evame" },
			payload: {
				workflow_run: {
					event,
					conclusion,
					head_sha: head,
					head_branch: event === "pull_request" ? "fix/example" : "main",
					head_repository: { full_name: repository },
					pull_requests: [
						{ number: 1176, base: { sha: base }, head: { sha: head } },
					],
				},
			},
		},
		github,
		{
			setOutput: (key: string, value: string) => {
				outputs[key] = value;
			},
			notice: vi.fn(),
		},
		() => ({ readFileSync: () => `${source}\n` }),
	);
	return { outputs, github };
}

it("成功した同一リポジトリPRの検証済みマージコミットだけをPreviewへ渡す", async () => {
	const { outputs } = await resolvePublication();
	expect(outputs).toEqual({ target: "preview", sha: merge, pr: "1176" });
});

it.each(["failure", "cancelled", "skipped"])(
	"CIが%sなら外部公開を開始しない",
	async (conclusion) => {
		const { outputs, github } = await resolvePublication({ conclusion });
		expect(outputs).toEqual({});
		expect(github.rest.pulls.get).not.toHaveBeenCalled();
	},
);

it("forkの成功CIに公開権限を渡さない", async () => {
	const { outputs, github } = await resolvePublication({
		repository: "outsider/evame",
	});
	expect(outputs).toEqual({});
	expect(github.rest.pulls.get).not.toHaveBeenCalled();
});

it.each([{ currentHead: newer }, { state: "closed" }])(
	"更新済み・閉じたPRの古いCIは公開しない: %j",
	async (scenario) => {
		expect((await resolvePublication(scenario)).outputs).toEqual({});
	},
);

it.each([
	{ source: "invalid" },
	{ parents: [base, newer] },
	{ parents: [newer, head] },
])(
	"別のコミットや不正な成果物を検証済みとして公開しない: %j",
	async (scenario) => {
		await expect(resolvePublication(scenario)).rejects.toThrow();
	},
);

it("mainの成功CIと一致するコミットだけを本番へ渡し、古いCIへ巻き戻さない", async () => {
	expect(
		(await resolvePublication({ event: "push", source: head })).outputs,
	).toEqual({ target: "production", sha: head });
	expect(
		(
			await resolvePublication({
				event: "push",
				source: head,
				currentHead: newer,
			})
		).outputs,
	).toEqual({});
	await expect(
		resolvePublication({ event: "push", source: merge }),
	).rejects.toThrow();
});

it.each(["write", "maintain", "admin"])(
	"書き込み権限%sを持つ人の検証済みPRだけを自動公開する",
	async (authorPermission) => {
		const { outputs, github } = await resolvePublication({ authorPermission });
		expect(outputs.target).toBe("preview");
		expect(
			github.rest.repos.getCollaboratorPermissionLevel,
		).toHaveBeenCalledWith({
			owner: "ttizze",
			repo: "evame",
			username: "contributor",
		});
	},
);

it.each([
	{ authorType: "Bot" },
	{ authorType: "" },
	{ authorPermission: "read" },
	{ authorPermission: "triage" },
	{ authorPermission: "none" },
	{ authorPermission: "unknown" },
])(
	"同一リポジトリでもBot・書き込み権限のない投稿者へ公開secretを渡さない: %j",
	async (scenario) => {
		const { outputs, github } = await resolvePublication(scenario);
		expect(outputs).toEqual({});
		expect(github.rest.repos.getCommit).not.toHaveBeenCalled();
	},
);

it.each([403, 404])(
	"投稿者の権限取得がHTTP %sで失敗したら公開を止める",
	async (permissionStatus) => {
		await expect(resolvePublication({ permissionStatus })).rejects.toThrow(
			"Permission lookup failed",
		);
	},
);
