// scripts/sqldef.mjs
// psqldef バイナリを直接叩いて DB マイグレーションを実行する
import { execFileSync, execSync } from "child_process";
import { chmodSync, existsSync, writeFileSync } from "fs";
import path from "path";

const dbUrl = new URL(process.env.DATABASE_URL);
const database = dbUrl.pathname.slice(1);

// psqldef に渡す共通オプション
const common = [
  database,
  `--host=${dbUrl.hostname}`,
  `--user=${dbUrl.username}`,
  `--password=${dbUrl.password}`,
];
if (dbUrl.port) common.push(`--port=${dbUrl.port}`);

const subcommand = process.argv[2]; // export | plan | migrate

let args;
if (subcommand === "export") {
  // 現在の DB スキーマを出力
  args = [...common, "--export"];
} else if (subcommand === "plan") {
  // dry-run: 変更内容を表示するだけで実行しない
  args = [...common, "--dry-run", "--file=schema.sql"];
} else if (subcommand === "migrate") {
  // 実際にマイグレーション実行
  args = [...common, "--file=schema.sql"];
} else {
  console.error("Usage: bun scripts/sqldef.mjs [export|plan|migrate]");
  process.exit(1);
}

// psqldef バイナリが無ければ GitHub から直接取得（postinstall が動かない環境用）
const sqldefDir = path.join(process.cwd(), "node_modules", "sqldef");
const psqldefBin = path.join(sqldefDir, "psqldef");

if (!existsSync(psqldefBin)) {
  console.log("psqldef not found, downloading from GitHub...");

  // Vercel は linux_amd64、ローカルは環境に応じて切り替え
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  const ext = platform === "linux" ? "tar.gz" : "zip";
  const downloadUrl = `https://github.com/sqldef/sqldef/releases/latest/download/psqldef_${platform}_${arch}.${ext}`;
  const archivePath = path.join(sqldefDir, `psqldef.${ext}`);

  // Node.js 18+ の fetch でダウンロード（Vercel 環境で確実に動く）
  const res = await fetch(downloadUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to download psqldef: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(archivePath, buffer);

  // 展開（Vercel は Amazon Linux 2 なので tar/unzip は使える）
  if (ext === "tar.gz") {
    execSync(`tar -xzf "${archivePath}" -C "${sqldefDir}" psqldef`, { stdio: "inherit" });
  } else {
    execSync(`unzip -o "${archivePath}" psqldef -d "${sqldefDir}"`, { stdio: "inherit" });
  }

  chmodSync(psqldefBin, 0o755);
  console.log("psqldef downloaded successfully");
}

// psqldef を直接実行（node-sqldef ラッパーを経由しない）
execFileSync(psqldefBin, args, { stdio: "inherit" });
