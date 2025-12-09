// scripts/sqldef.ts
// psqldef バイナリを直接叩いて DB マイグレーションを実行する

import { execFileSync, execSync } from "node:child_process";
import { chmodSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA_FILE = "schema.sql";
const SQLDEF_DIR = path.join(process.cwd(), "node_modules", "sqldef");
const PSQLDEF_BIN = path.join(SQLDEF_DIR, "psqldef");

type Subcommand = "export" | "plan" | "migrate";

// サブコマンドごとの追加オプションを定義
const SUBCOMMAND_OPTIONS: Record<Subcommand, string[]> = {
	export: ["--export"],
	plan: ["--dry-run", `--file=${SCHEMA_FILE}`, "--enable-drop"],
	migrate: [`--file=${SCHEMA_FILE}`, "--enable-drop"],
};

// psqldef バイナリが無ければ GitHub から取得
async function ensurePsqldef(): Promise<void> {
	if (existsSync(PSQLDEF_BIN)) return;

	console.log("psqldef not found, downloading from GitHub...");

	const platform = process.platform === "win32" ? "windows" : process.platform;
	const arch = process.arch === "x64" ? "amd64" : process.arch;
	const ext = platform === "linux" ? "tar.gz" : "zip";
	const downloadUrl = `https://github.com/sqldef/sqldef/releases/latest/download/psqldef_${platform}_${arch}.${ext}`;
	const archivePath = path.join(SQLDEF_DIR, `psqldef.${ext}`);

	const res = await fetch(downloadUrl, { redirect: "follow" });
	if (!res.ok) throw new Error(`Failed to download psqldef: ${res.status}`);

	writeFileSync(archivePath, Buffer.from(await res.arrayBuffer()));

	const extractCmd =
		ext === "tar.gz"
			? `tar -xzf "${archivePath}" -C "${SQLDEF_DIR}" psqldef`
			: `unzip -o "${archivePath}" psqldef -d "${SQLDEF_DIR}"`;
	execSync(extractCmd, { stdio: "inherit" });

	chmodSync(PSQLDEF_BIN, 0o755);
	console.log("psqldef downloaded successfully");
}

// DATABASE_URL から psqldef 用の接続オプションを生成
function buildConnectionArgs(): string[] {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not defined");
	}
	const dbUrl = new URL(process.env.DATABASE_URL);
	const args = [
		dbUrl.pathname.slice(1), // database name
		`--host=${dbUrl.hostname}`,
		`--user=${dbUrl.username}`,
		`--password=${dbUrl.password}`,
	];
	if (dbUrl.port) args.push(`--port=${dbUrl.port}`);
	return args;
}

// 管理対象スキーマを public に限定する（環境変数で上書き可）
function buildConfigArgs(): string[] {
	const configInline =
		process.env.SQLDEF_CONFIG_INLINE ?? "target_schema: |\n  public";
	return [`--config-inline=${configInline}`];
}

// サブcommandを安全に取得する
function parseSubcommand(): Subcommand {
	const subcommand = process.argv[2] as Subcommand | undefined;
	if (!subcommand || !SUBCOMMAND_OPTIONS[subcommand]) {
		console.error("Usage: bun scripts/sqldef.ts [export|plan|migrate]");
		process.exit(1);
	}
	return subcommand;
}

// psqldef を実行する引数を組み立てる
function buildArgs(subcommand: Subcommand): string[] {
	return [
		...buildConnectionArgs(),
		...buildConfigArgs(),
		...SUBCOMMAND_OPTIONS[subcommand],
	];
}

// メイン処理: 何をするか→psqldefを準備し、指定サブコマンドを実行する
async function main(): Promise<void> {
	const subcommand = parseSubcommand();
	await ensurePsqldef();
	const args = buildArgs(subcommand);

	if (subcommand === "export") {
		// 何のために: スキーマをファイルへ書き出す
		const output = execFileSync(PSQLDEF_BIN, args, { encoding: "utf-8" });
		writeFileSync(SCHEMA_FILE, output);
		console.log(`Exported schema to ${SCHEMA_FILE}`);
		return;
	}

	// 何のために: plan/migrate をそのまま実行する
	execFileSync(PSQLDEF_BIN, args, { stdio: "inherit" });
}

await main();
