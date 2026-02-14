import { resolve } from "node:path";
import { applyPushResultToState, buildPushRequest } from "../domain/sync-state";
import { loginWithBrowser } from "../infra/browser-login";
import { requestPull, requestPush } from "../infra/sync-api";
import {
	printContentDirInfo,
	printHelp,
	printPushSummary,
} from "../utils/output";
import {
	clearAuthToken,
	loadAuthToken,
	resolveAuthFilePath,
	saveAuthToken,
} from "./auth";
import { loadOrCreateConfig } from "./config";
import { collectMarkdownFiles } from "./markdown";
import { applyPullResultToLocal, loadState, saveState } from "./state";

export async function runCommand(
	command: string | undefined,
	args: string[],
): Promise<number> {
	// ルーティングだけを担当し、実処理は各コマンド関数に委譲する。
	// command 未指定時は help 扱いにして、誤操作でも使い方へ戻せるようにする。
	if (
		command === "--help" ||
		command === "-h" ||
		args.includes("--help") ||
		args.includes("-h")
	) {
		printHelp();
		return 0;
	}
	switch (command) {
		case "push":
			return runPushCommand(args);
		case "pull":
			return runPullCommand(args);
		case "login":
			return runLoginCommand();
		case "logout":
			return runLogoutCommand();
		case "help":
		case undefined:
			printHelp();
			return 0;
		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

async function runPushCommand(args: string[]): Promise<number> {
	// dry-run は state を保存せず、payload の生成と検証のみを行う。
	const dryRun = args.includes("--dry-run");
	const cwd = process.cwd();
	const { config, created } = await loadOrCreateConfig(cwd);
	// CLI単体でも動作できるよう、環境変数が無ければ localhost を既定にする。
	const baseUrl =
		process.env.EVAME_BASE_URL ??
		process.env.NEXT_PUBLIC_DOMAIN ??
		"http://localhost:3000";
	const contentDir = resolve(cwd, config.content_dir);
	printContentDirInfo(cwd, contentDir, config.content_dir, created);
	const token = await loadAuthToken(process.env);
	const state = await loadState(cwd);
	const collected = await collectMarkdownFiles(contentDir);
	// state の revision を expected_revision に反映して楽観ロックを行う。
	const payload = buildPushRequest(collected.files, state, dryRun);

	if (payload.inputs.length === 0) {
		console.log("No files to sync.");
		if (collected.skippedNoFrontmatterCount > 0) {
			console.log(
				`Skipped ${collected.skippedNoFrontmatterCount} markdown files without frontmatter.`,
			);
		}
		return 0;
	}

	const response = await requestPush(baseUrl, token, payload);
	printPushSummary(response, dryRun);

	// 反映成功した slug のみ次回比較用 revision を更新する。
	const nextState = applyPushResultToState(state, response, dryRun);
	if (!dryRun) {
		await saveState(cwd, nextState);
	}

	if (response.status === "conflict") {
		return 1;
	}
	return 0;
}

async function runPullCommand(args: string[]): Promise<number> {
	// force 指定時のみ、リモート内容でローカル編集を上書きする。
	const force = args.includes("--force");
	const cwd = process.cwd();
	const { config, created } = await loadOrCreateConfig(cwd);
	// push と同じ解決順で API ベースURLを決める。
	const baseUrl =
		process.env.EVAME_BASE_URL ??
		process.env.NEXT_PUBLIC_DOMAIN ??
		"http://localhost:3000";
	const contentDir = resolve(cwd, config.content_dir);
	printContentDirInfo(cwd, contentDir, config.content_dir, created);
	const token = await loadAuthToken(process.env);
	const state = await loadState(cwd);
	const response = await requestPull(baseUrl, token);

	// pull結果をローカルファイルと state に反映する。
	const applied = await applyPullResultToLocal({
		contentDir,
		pages: response.pages,
		force,
		state,
	});
	await saveState(cwd, applied.nextState);

	console.log(
		`Pull completed: written=${applied.writtenSlugs.length}, skipped=${applied.skippedSlugs.length}, state_removed=${applied.removedSlugs.length}`,
	);
	if (applied.skippedSlugs.length > 0) {
		console.log(
			`Skipped slugs (use --force to overwrite): ${applied.skippedSlugs.join(", ")}`,
		);
	}

	return 0;
}

async function runLoginCommand(): Promise<number> {
	// push/pull と同じ UX にするため、login でも設定ファイルを確定させる。
	const cwd = process.cwd();
	const { config, created } = await loadOrCreateConfig(cwd);
	const contentDir = resolve(cwd, config.content_dir);
	printContentDirInfo(cwd, contentDir, config.content_dir, created);

	const baseUrl =
		process.env.EVAME_BASE_URL ??
		process.env.NEXT_PUBLIC_DOMAIN ??
		"http://localhost:3000";
	// ブラウザ認証で受け取った token をローカルに保存する。
	const token = await loginWithBrowser(baseUrl);
	await saveAuthToken(token, process.env);
	console.log("Login successful.");
	console.log(`Auth file: ${resolveAuthFilePath(process.env)}`);
	console.log("");
	console.log("Next:");
	console.log("  evame pull");
	console.log("  evame pull --force");
	console.log("  evame push");
	console.log("  evame push --dry-run");
	console.log("  evame help");
	return 0;
}

async function runLogoutCommand(): Promise<number> {
	// 既存トークンを削除して、次回は再ログインを必須にする。
	await clearAuthToken(process.env);
	console.log("Logged out.");
	return 0;
}
