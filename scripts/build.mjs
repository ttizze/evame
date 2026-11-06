import "dotenv/config";
import { spawn } from "node:child_process";
import { startTursoServer } from "./turso-dev-server.mjs";

const url = process.env.TURSO_DATABASE_URL ?? "";
let database;
try {
	if (url.startsWith("file:")) {
		database = await startTursoServer(url.slice(5), null);
	}
	const child = spawn(
		"bun",
		["x", "vite", "build", "--config", "vite.config.ts"],
		{
			stdio: "inherit",
			env: {
				...process.env,
				CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
				...(database
					? { TURSO_DATABASE_URL: database.url, TURSO_AUTH_TOKEN: "" }
					: {}),
			},
		},
	);
	process.exitCode = await new Promise((resolve, reject) => {
		child.once("error", reject);
		child.once("exit", (code) => resolve(code ?? 1));
	});
} finally {
	await database?.stop();
}
