import { join } from "node:path";

export function printPushSummary(
	response: {
		status: "applied" | "no_change" | "conflict";
		results: Array<{
			slug: string;
			action: "AUTO_APPLY" | "NO_CHANGE" | "CONFLICT";
			detail?: "UPSERT";
			reason?: string;
		}>;
	},
	dryRun: boolean,
) {
	// dry-run 時は見分けやすい接頭辞を付ける。
	const prefix = dryRun ? "[dry-run] " : "";
	console.log(`${prefix}Push result: ${response.status}`);
	// slugごとの結果を表示し、手動解決が必要な衝突を見つけやすくする。
	for (const row of response.results) {
		if (row.action === "AUTO_APPLY") {
			console.log(`  - ${row.slug}: applied (${row.detail ?? "UPSERT"})`);
			continue;
		}
		if (row.action === "NO_CHANGE") {
			console.log(`  - ${row.slug}: no_change`);
			continue;
		}
		console.log(`  - ${row.slug}: conflict (${row.reason ?? "unknown"})`);
	}
}

export function printHelp() {
	// CLI単体で使い方が完結するよう、最小コマンドセットを表示する。
	console.log(`evame CLI

Usage:
  evame login
  evame push
  evame push --dry-run
  evame pull
  evame pull --force
  evame logout
  evame help
  evame --help
  evame -h

Authentication:
  1) Use \`evame login\` for browser-based login
  2) In CI, set the \`EVAME_PAT\` environment variable
`);
}

export function printContentDirInfo(
	cwd: string,
	contentDir: string,
	rawContentDir: string,
	created: boolean,
) {
	// 設定位置を毎回表示し、ユーザーが編集場所を迷わないようにする。
	const configPath = join(cwd, ".evame", "config.json");
	if (created) {
		console.log(`Created config file automatically: ${configPath}`);
		console.log("Why: this file stores the default sync target for push/pull.");
	}
	console.log(`Sync target directory: ${contentDir}`);
	console.log(`Config: ${configPath} (content_dir=${rawContentDir})`);
	console.log(
		`Tip: edit content_dir in ${configPath} before running push/pull.`,
	);
}
