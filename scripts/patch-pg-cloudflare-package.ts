import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET_DEFAULT_EXPORT = "./dist/index.js";

export function patchPgCloudflarePackageJson(source: string) {
	const packageJson = JSON.parse(source) as {
		exports?: {
			"."?: {
				default?: string;
			};
		};
	};

	if (!packageJson.exports?.["."]) {
		throw new Error('pg-cloudflare package.json is missing exports["."]');
	}

	if (packageJson.exports["."].default === TARGET_DEFAULT_EXPORT) {
		return source;
	}

	packageJson.exports["."].default = TARGET_DEFAULT_EXPORT;
	return `${JSON.stringify(packageJson, null, 2)}\n`;
}

if (import.meta.main) {
	const packageJsonPath = resolve("node_modules/pg-cloudflare/package.json");
	const source = readFileSync(packageJsonPath, "utf8");
	const patched = patchPgCloudflarePackageJson(source);

	if (patched === source) {
		console.log("pg-cloudflare package.json already patched");
		process.exit(0);
	}

	writeFileSync(packageJsonPath, patched);
	console.log("Patched pg-cloudflare package.json for OpenNext");
}
