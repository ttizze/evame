// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";
import {
	confirmPreviewApproval,
	confirmPublication,
	publicationSignal,
	verifiedPublication,
} from "./cloudflare-build.mjs";

const head = "1".repeat(40);
const base = "2".repeat(40);
const merge = "3".repeat(40);
const repository = { full_name: "ttizze/evame" };
const branch = "t3/faster-ci";
const run = {
	id: 11750,
	path: ".github/workflows/ci.yaml",
	head_repository: repository,
	head_branch: branch,
	head_sha: head,
	event: "pull_request",
	status: "completed",
	conclusion: "success",
	display_title: `CI ${merge}`,
	pull_requests: [
		{
			number: 1175,
			base: { ref: "main", sha: base },
			head: { ref: branch, sha: head },
		},
	],
};

afterEach(() => vi.unstubAllGlobals());

it("PRの成功したCIが検証したマージコミットを公開対象にする", () => {
	expect(verifiedPublication(run)).toEqual({
		sha: merge,
		pr: { number: 1175, base, runId: 11750 },
	});
});

it("本番はmainの成功したCIが検証したコミットを公開対象にする", () => {
	const main = {
		...run,
		head_branch: "main",
		event: "push",
		display_title: `CI ${head}`,
		pull_requests: [],
	};
	expect(verifiedPublication(main)).toEqual({
		sha: head,
		pr: null,
	});
	expect(() =>
		verifiedPublication({ ...main, display_title: `CI ${merge}` }),
	).toThrow();
});

it.each(["failure", "cancelled", "skipped", "neutral"])(
	"CIが%sなら公開を許可しない",
	(conclusion) => {
		expect(() => verifiedPublication({ ...run, conclusion })).toThrow();
	},
);

it("CIが完了するまで公開を許可しない", () => {
	expect(
		verifiedPublication({ ...run, status: "in_progress", conclusion: null }),
	).toBeNull();
});

it.each([
	{ head_repository: { full_name: "other/evame" } },
	{ head_branch: "main" },
	{ head_sha: "invalid" },
	{ path: ".github/workflows/other.yaml" },
])(
	"fork・対象外ブランチ・不正SHA・別ワークフローの実行を除外する (%j)",
	(changes) => {
		expect(verifiedPublication({ ...run, ...changes })).toBeNull();
	},
);

it("PRを一意に特定できないCIは公開対象にしない", () => {
	expect(() => verifiedPublication({ ...run, pull_requests: [] })).toThrow();
});

const openPull = {
	state: "open",
	author_association: "OWNER",
	user: { type: "User", login: "owner" },
	head: { ref: branch, sha: head, repo: repository },
	base: { ref: "main", sha: base },
	merge_commit_sha: merge,
};

it("mainが進んでも同じPRの検証済みマージコミットを公開できる", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () =>
			Response.json({
				...openPull,
				base: { ...openPull.base, sha: head },
				merge_commit_sha: base,
			}),
		),
	);
	await expect(
		confirmPublication(verifiedPublication(run), branch, head),
	).resolves.toBe("owner");
});

it.each([
	{ state: "closed" },
	{ head: { ...openPull.head, sha: base } },
	{ head: { ...openPull.head, repo: { full_name: "other/evame" } } },
	{ base: { ...openPull.base, ref: "other" } },
	{ user: { type: "Bot", login: "bot" } },
	{ author_association: "CONTRIBUTOR" },
])(
	"CI後にPRの対象または公開資格が変わったら公開しない (%j)",
	async (changes) => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Response.json({ ...openPull, ...changes })),
		);
		await expect(
			confirmPublication(verifiedPublication(run), branch, head),
		).rejects.toThrow();
	},
);

it("CIが成功していてもmainが更新されたら旧コミットを公開しない", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => Response.json({ object: { sha: base } })),
	);
	await expect(
		confirmPublication({ sha: head, pr: null }, "main", head),
	).rejects.toThrow();
});

it.each(["success", "skipped"])(
	"CIのPR公開許可が%sのときだけPreviewを許可する",
	async (conclusion) => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				Response.json({
					jobs: [
						{
							name: "ci-check",
							conclusion: "success",
							steps: [{ name: "Authorize Workers Preview", conclusion }],
						},
					],
				}),
			),
		);
		const check = confirmPreviewApproval(run.id);
		if (conclusion === "success") await expect(check).resolves.toBeUndefined();
		else
			await expect(check).rejects.toThrow("CI did not authorize publication");
	},
);

it("公開専用ブランチと有効な実行IDの組だけを処理する", () => {
	const message = '{"ciRunId":11750,"publishRunId":11800}';
	expect(publicationSignal("cf-publish/main", "preview", message)).toBeNull();
	expect(
		publicationSignal("cf-publish/pr-1175", "production", message),
	).toBeNull();
	expect(publicationSignal("cf-publish/main", "production", message)).toEqual({
		ciRunId: 11750,
		publishRunId: 11800,
		pr: null,
	});
	expect(publicationSignal("cf-publish/pr-1175", "preview", message)).toEqual({
		ciRunId: 11750,
		publishRunId: 11800,
		pr: 1175,
	});
	expect(
		publicationSignal("t3/faster-ci", "preview", "任意のコミットメッセージ"),
	).toBeNull();
	expect(() =>
		publicationSignal(
			"cf-publish/main",
			"production",
			'{"ciRunId":"11750","publishRunId":11800}',
		),
	).toThrow();
});

it.each(["production", "preview", "failed-migration"] as const)(
	"Workers Buildsで検証対象をビルドし、%sの公開処理を呼び出す",
	(mode) => {
		const path = mkdtempSync(join(tmpdir(), "evame-cloudflare-build-"));
		const script = fileURLToPath(
			new URL("./cloudflare-build.mjs", import.meta.url),
		);
		const production = mode !== "preview";
		const signal = "4".repeat(40);
		const target = production ? "cf-publish/main" : "cf-publish/pr-1175";
		try {
			mkdirSync(join(path, "dist/client"), { recursive: true });
			writeFileSync(
				join(path, "git"),
				`#!/bin/sh
printf 'git %s\\n' "$*" >> calls
if [ "$1 $2" = 'rev-parse HEAD' ]; then echo ${signal}; fi
if [ "$1" = log ]; then echo '{"ciRunId":11750,"publishRunId":11800}'; fi
if [ "$1" = cat-file ]; then printf 'parent %s\\nparent %s\\n\\nfixture\\n' '${base}' '${head}'; fi
`,
				{ mode: 0o755 },
			);
			writeFileSync(
				join(path, "bun"),
				`#!/bin/sh
printf 'bun %s\\n' "$*" >> calls
case "$*" in
  'install --frozen-lockfile'|'run build')
    test -z "$TURSO_AUTH_TOKEN$EVAME_PREVIEW_SECRETS$CLOUDFLARE_API_TOKEN" ;;
  'run deploy:workers') test "$CLOUDFLARE_API_TOKEN" = 'fixture-cf' && test -n "$EVAME_WORKERS_PUBLICATION" ;;
  'run preview:workers deploy') test "$PR_NUMBER" = 1175 && test "$EVAME_PREVIEW_SECRETS" = 'fixture-preview' && test -n "$EVAME_WORKERS_PUBLICATION" ;;
  *) exit 1 ;;
esac
`,
				{ mode: 0o755 },
			);
			const successfulRun = production
				? {
						...run,
						head_branch: "main",
						event: "push",
						display_title: `CI ${head}`,
					}
				: run;
			writeFileSync(
				join(path, "github.mjs"),
				`globalThis.fetch = async (url) => {
  const path = new URL(url).pathname;
  if (path.endsWith('/actions/runs/11750')) return Response.json(${JSON.stringify(successfulRun)});
  if (path.endsWith('/actions/runs/11800')) return Response.json({ path: '.github/workflows/publish.yaml', head_repository: { full_name: 'ttizze/evame' }, head_branch: 'main', event: 'workflow_run', display_title: 'Publish CI 11750' });
  if (path.endsWith('/actions/runs/11800/jobs')) return Response.json({ jobs: [{ name: 'migrate', conclusion: '${mode === "failed-migration" ? "failure" : "success"}' }] });
  if (path.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: '${head}' } });
  if (path.endsWith('/pulls/1175')) return Response.json(${JSON.stringify(openPull)});
  if (path.endsWith('/actions/runs/11750/jobs')) return Response.json({ jobs: [{ name: 'ci-check', conclusion: 'success', steps: [{ name: 'Authorize Workers Preview', conclusion: 'success' }] }] });
  return new Response(null, { status: 404 });
};`,
			);
			const runBuild = () =>
				execFileSync(
					process.execPath,
					[
						"--import",
						join(path, "github.mjs"),
						script,
						production ? "production" : "preview",
					],
					{
						cwd: path,
						env: {
							PATH: `${path}:${process.env.PATH}`,
							WORKERS_CI: "1",
							WORKERS_CI_BRANCH: target,
							WORKERS_CI_COMMIT_SHA: signal,
							TURSO_AUTH_TOKEN: "fixture-db",
							CLOUDFLARE_API_TOKEN: "fixture-cf",
							EVAME_PREVIEW_SECRETS: "fixture-preview",
						},
						stdio: "pipe",
					},
				);
			if (mode === "failed-migration") {
				expect(runBuild).toThrow("no successful DB migration");
				expect(readFileSync(join(path, "calls"), "utf8")).not.toMatch(
					/bun run (?:preview|deploy):workers/,
				);
				return;
			}
			runBuild();
			const calls = readFileSync(join(path, "calls"), "utf8")
				.trim()
				.split("\n");
			if (production) {
				expect(calls).toEqual([
					"git rev-parse HEAD",
					"git log -1 --format=%B",
					`git fetch --no-tags --depth=1 https://github.com/ttizze/evame.git ${head}`,
					`git switch --detach ${head}`,
					"bun install --frozen-lockfile",
					"bun run build",
					"bun run deploy:workers",
				]);
			} else {
				expect(calls).toEqual([
					"git rev-parse HEAD",
					"git log -1 --format=%B",
					`git fetch --no-tags --depth=1 https://github.com/ttizze/evame.git ${merge}`,
					`git cat-file commit ${merge}`,
					`git switch --detach ${merge}`,
					"bun install --frozen-lockfile",
					"bun run build",
					"bun run preview:workers deploy",
				]);
				expect(
					readFileSync(
						join(path, "dist/client/evame-preview-commit.txt"),
						"utf8",
					).trim(),
				).toBe(merge);
			}
		} finally {
			rmSync(path, { recursive: true, force: true });
		}
	},
);
