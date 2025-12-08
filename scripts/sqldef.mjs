// scripts/sqldef.mjs
// psqldef バイナリを確保し、DBマイグレーションを実行する
import { execFileSync, execSync } from "child_process";
import { chmodSync, existsSync, writeFileSync } from "fs";
import path from "path";

const dbUrl = new URL(process.env.DATABASE_URL);

const common = [
  "--type=postgres",
  `--host=${dbUrl.hostname}`,
  `--port=${dbUrl.port}`,
  `--database=${dbUrl.pathname.slice(1)}`,
  `--user=${dbUrl.username}`,
  `--password=${dbUrl.password}`,
  "--file=schema.sql",
];

const subcommand = process.argv[2]; // export | plan | migrate

let args;
if (subcommand === "export") {
  args = ["export", ...common, "--no-confirm"];
} else if (subcommand === "plan") {
  args = ["import", ...common, "--no-confirm", "--dry"];
} else if (subcommand === "migrate") {
  args = ["import", ...common, "--no-confirm"];
} else {
  console.error("Usage: bun scripts/sqldef.mjs [export|plan|migrate]");
  process.exit(1);
}

// ★ pnpx / bunx は使わず、node_modules/.bin/sqldef を直叩き
const bin = path.join(process.cwd(), "node_modules", ".bin", "sqldef");

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

execFileSync(bin, args, { stdio: "inherit" });
