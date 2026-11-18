import { execFileSync } from "node:child_process";
import { confirmDeployment } from "./cloudflare-build.mjs";
import { prepareReaderStorage } from "./prepare-reader-storage.mjs";

const deployment = JSON.parse(process.env.EVAME_WORKERS_PUBLICATION ?? "null");
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, ...wranglerEnv } = process.env;
if (deployment && (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN))
	throw new Error(
		"Production DB migration requires its configured Turso credentials",
	);
await prepareReaderStorage("dist/server/wrangler.json", false, deployment);
if (deployment) {
	await confirmDeployment(deployment);
	execFileSync("bun", ["run", "db:prod:migrate"], { stdio: "inherit" });
	await confirmDeployment(deployment);
}
execFileSync(
	"bun",
	["x", "wrangler", "deploy", "--config", "dist/server/wrangler.json"],
	{ stdio: "inherit", env: deployment ? wranglerEnv : process.env },
);
