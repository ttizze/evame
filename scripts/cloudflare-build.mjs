import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const repository = "ttizze/evame";
const shaPattern = /^[a-f0-9]{40}$/;

export function verifiedPublication(run) {
	const branch = run.head_branch;
	const head = run.head_sha;
	const production = branch === "main";
	if (
		run.path !== ".github/workflows/ci.yaml" ||
		run.head_repository?.full_name !== repository ||
		!branch ||
		!shaPattern.test(head) ||
		run.status !== "completed" ||
		!(production
			? ["push", "workflow_dispatch"].includes(run.event)
			: run.event === "pull_request")
	)
		return null;
	if (run.conclusion !== "success")
		throw new Error(`CI did not succeed (${run.conclusion})`);
	const sha = /^CI ([a-f0-9]{40})$/.exec(run.display_title)?.[1];
	if (!sha || (production && sha !== head))
		throw new Error("CI did not verify the publication revision");
	if (production) return { sha, pr: null };
	const [pr] = run.pull_requests;
	if (
		run.pull_requests.length !== 1 ||
		!Number.isSafeInteger(pr.number) ||
		pr.number <= 0 ||
		pr.base.ref !== "main" ||
		!shaPattern.test(pr.base.sha) ||
		pr.head.ref !== branch ||
		pr.head.sha !== head
	)
		throw new Error("CI did not verify a single pull request for this branch");
	return { sha, pr: { number: pr.number, base: pr.base.sha, runId: run.id } };
}

export function previewOrigin(number) {
	return `https://pr-${number}-evame-start.reimei.workers.dev`;
}

async function github(path) {
	const response = await fetch(
		`https://api.github.com/repos/${repository}/${path}`,
		{
			headers: {
				Accept: "application/vnd.github+json",
				"Cache-Control": "no-cache",
			},
			signal: AbortSignal.timeout(15_000),
		},
	);
	if (!response.ok)
		throw new Error(`GitHub revision lookup failed (HTTP ${response.status})`);
	return response.json();
}

export async function confirmPublication(
	publication,
	branch,
	head,
	get = github,
) {
	if (!publication.pr) {
		const main = await get("git/ref/heads/main");
		if (main.object.sha !== publication.sha)
			throw new Error("main changed after CI verification");
		return null;
	}
	const pr = await get(`pulls/${publication.pr.number}`);
	if (
		pr.state !== "open" ||
		pr.head.repo?.full_name !== repository ||
		pr.head.ref !== branch ||
		pr.head.sha !== head ||
		pr.base.ref !== "main" ||
		pr.user.type !== "User" ||
		!["OWNER", "MEMBER", "COLLABORATOR"].includes(pr.author_association)
	)
		throw new Error("Pull request is no longer eligible for this CI revision");
	return pr.user.login;
}

export async function confirmPreviewApproval(runId, get = github) {
	if (!Number.isSafeInteger(runId) || runId <= 0)
		throw new Error("Invalid GitHub CI run ID");
	const { jobs } = await get(`actions/runs/${runId}/jobs?per_page=100`);
	const gate = jobs.find((job) => job.name === "ci-check");
	if (
		gate?.conclusion !== "success" ||
		!gate.steps.some(
			(step) =>
				step.name === "Authorize Workers Preview" &&
				step.conclusion === "success",
		)
	)
		throw new Error("CI did not authorize publication for this Preview");
}

export async function confirmDeployment({
	publication,
	branch,
	head,
	signalBranch,
	signalSha,
}) {
	await confirmPublication(publication, branch, head);
	const latest = await github(`git/ref/heads/${signalBranch}`);
	if (latest.object.sha !== signalSha)
		throw new Error("A newer publication signal superseded this build");
}

export function publicationSignal(branch, mode, message) {
	const target = /^cf-publish\/(main|pr-([1-9]\d*))$/.exec(branch);
	if (!target || mode !== (target[2] ? "preview" : "production")) return null;
	const { ciRunId, publishRunId } = JSON.parse(message);
	if (
		![ciRunId, publishRunId].every((id) => Number.isSafeInteger(id) && id > 0)
	)
		throw new Error("Invalid publication signal");
	return { ciRunId, publishRunId, pr: target[2] ? Number(target[2]) : null };
}

async function loadPublication({ ciRunId, publishRunId, pr }) {
	const [run, publisher, { jobs }] = await Promise.all([
		github(`actions/runs/${ciRunId}`),
		github(`actions/runs/${publishRunId}`),
		github(`actions/runs/${publishRunId}/jobs?per_page=100`),
	]);
	if (
		publisher.path !== ".github/workflows/publish.yaml" ||
		publisher.head_repository?.full_name !== repository ||
		publisher.head_branch !== "main" ||
		publisher.event !== "workflow_run" ||
		publisher.display_title !== `Publish CI ${ciRunId}` ||
		!jobs.some((job) => job.name === "migrate" && job.conclusion === "success")
	)
		throw new Error("The publication signal has no successful DB migration");
	const publication = verifiedPublication(run);
	if (!publication || (publication.pr?.number ?? null) !== pr)
		throw new Error("The publication signal does not match verified CI");
	return { publication, branch: run.head_branch, head: run.head_sha };
}

if (import.meta.main) {
	const mode = process.argv[2];
	const { WORKERS_CI_BRANCH: signalBranch, WORKERS_CI_COMMIT_SHA: signalSha } =
		process.env;
	if (
		process.env.WORKERS_CI !== "1" ||
		!["production", "preview"].includes(mode) ||
		!signalSha ||
		!shaPattern.test(signalSha) ||
		!signalBranch
	)
		throw new Error("Cloudflare Workers Builds revision is required");
	if (
		execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
		signalSha
	)
		throw new Error("Cloudflare checked out a different publication signal");
	const signal = publicationSignal(
		signalBranch,
		mode,
		execFileSync("git", ["log", "-1", "--format=%B"], { encoding: "utf8" }),
	);
	if (!signal) {
		console.log("No verified publication signal for this branch");
		process.exit(0);
	}
	const { publication, branch, head } = await loadPublication(signal);
	const pr = publication.pr?.number;
	if (pr) await confirmPreviewApproval(publication.pr.runId);
	await confirmPublication(publication, branch, head);
	execFileSync(
		"git",
		[
			"fetch",
			"--no-tags",
			"--depth=1",
			`https://github.com/${repository}.git`,
			publication.sha,
		],
		{ stdio: "inherit" },
	);
	if (pr) {
		const header = execFileSync(
			"git",
			["cat-file", "commit", publication.sha],
			{ encoding: "utf8" },
		).split("\n\n", 1)[0];
		const parents = Array.from(
			header.matchAll(/^parent ([a-f0-9]{40})$/gm),
			(match) => match[1],
		);
		if (parents.join(" ") !== `${publication.pr.base} ${head}`)
			throw new Error(
				"The fetched commit is not the verified PR merge revision",
			);
	}
	execFileSync("git", ["switch", "--detach", publication.sha], {
		stdio: "inherit",
	});

	const buildEnv = { ...process.env, TZ: "Asia/Tokyo" };
	for (const key of [
		"TURSO_DATABASE_URL",
		"TURSO_AUTH_TOKEN",
		"EVAME_PREVIEW_SECRETS",
		"CLOUDFLARE_API_TOKEN",
		"CLOUDFLARE_API_KEY",
	])
		delete buildEnv[key];
	if (pr)
		Object.assign(buildEnv, {
			VITE_PUBLIC_DOMAIN: previewOrigin(pr),
			VITE_AUTH_GOOGLE_ENABLED: "false",
			SENTRY_AUTH_TOKEN: "",
			SENTRY_DSN: "",
			VITE_SENTRY_DSN: "",
			GOOGLE_ANALYTICS_ID: "G-0000000000",
		});
	execFileSync("bun", ["install", "--frozen-lockfile"], {
		stdio: "inherit",
		env: buildEnv,
	});
	execFileSync("bun", ["run", "build"], { stdio: "inherit", env: buildEnv });
	const deploymentEnv = {
		...process.env,
		EVAME_WORKERS_PUBLICATION: JSON.stringify({
			publication,
			branch,
			head,
			signalBranch,
			signalSha,
		}),
	};
	if (pr) {
		await writeFile(
			"dist/client/evame-preview-commit.txt",
			`${publication.sha}\n`,
		);
		execFileSync("bun", ["run", "preview:workers", "deploy"], {
			stdio: "inherit",
			env: { ...deploymentEnv, PR_NUMBER: String(pr) },
		});
	} else {
		execFileSync("bun", ["run", "deploy:workers"], {
			stdio: "inherit",
			env: deploymentEnv,
		});
	}
}
