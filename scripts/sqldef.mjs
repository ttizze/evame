// scripts/sqldef.mjs
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

const url = new URL(process.env.DATABASE_URL);

const common = [
  "--type=postgres",
  `--host=${url.hostname}`,
  `--port=${url.port}`,
  `--database=${url.pathname.slice(1)}`,
  `--user=${url.username}`,
  `--password=${url.password}`,
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

// バイナリ未配置なら postinstall を再実行してリカバリ
const psqldefBin = path.join(process.cwd(), "node_modules", "sqldef", "psqldef");
if (!existsSync(psqldefBin)) {
  const postinstall = path.join(process.cwd(), "node_modules", "sqldef", "postinstall.js");
  execFileSync("node", [postinstall], { stdio: "inherit" });
}

execFileSync(bin, args, { stdio: "inherit" });
