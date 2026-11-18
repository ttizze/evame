import { execFileSync } from "node:child_process";
import { confirmDeployment } from "./cloudflare-build.mjs";
import { prepareReaderStorage } from "./prepare-reader-storage.mjs";

await prepareReaderStorage("dist/server/wrangler.json", false);
if (process.env.EVAME_WORKERS_PUBLICATION)
	await confirmDeployment(JSON.parse(process.env.EVAME_WORKERS_PUBLICATION));
execFileSync(
	"bun",
	["x", "wrangler", "deploy", "--config", "dist/server/wrangler.json"],
	{ stdio: "inherit" },
);
