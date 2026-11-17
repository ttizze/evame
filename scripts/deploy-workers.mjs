import { execFileSync } from "node:child_process";
import { prepareReaderStorage } from "./prepare-reader-storage.mjs";

await prepareReaderStorage("dist/server/wrangler.json", false);
execFileSync(
	"bun",
	["x", "wrangler", "deploy", "--config", "dist/server/wrangler.json"],
	{ stdio: "inherit" },
);
