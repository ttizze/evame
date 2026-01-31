import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Client } from "pg";

function getGitBranch(): string {
	// Use current git branch name for DB naming; fallback when detached.
	const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
		encoding: "utf8",
	});
	if (result.status !== 0) {
		return "detached";
	}
	const branch = (result.stdout || "").trim();
	return branch.length > 0 ? branch : "detached";
}

export function buildDatabaseName(baseName: string, branch: string): string {
	// Normalize branch name into a safe, short DB identifier.
	const suffix = branch
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.replace(/_+/g, "_");
	const safeSuffix = suffix.length > 0 ? suffix : "default";
	const rawName = `${baseName}__${safeSuffix}`;
	if (rawName.length <= 63) {
		return rawName;
	}
	const hash = createHash("sha256").update(rawName).digest("hex").slice(0, 10);
	const trimmedBase = baseName.slice(0, Math.max(1, 63 - hash.length - 2));
	return `${trimmedBase}__${hash}`;
}

export async function ensureDatabaseExists(
	databaseUrl: string,
	baseName: string,
	targetName: string,
): Promise<void> {
	// Create branch DB from base DB template using admin connection.
	const adminUrl = new URL(databaseUrl);
	adminUrl.pathname = "/postgres";
	const client = new Client({ connectionString: adminUrl.toString() });
	await client.connect();
	try {
		const exists = await client.query(
			"SELECT 1 FROM pg_database WHERE datname = $1",
			[targetName],
		);
		if (exists.rowCount === 0) {
			await client.query(
				`CREATE DATABASE "${targetName}" WITH TEMPLATE "${baseName}"`,
			);
		}
	} finally {
		await client.end();
	}
}

async function main(): Promise<void> {
	// Require DATABASE_URL and run target command with branch DB injected.
	const commandArgs = process.argv.slice(2);
	const baseUrl = process.env.DATABASE_URL;
	if (!baseUrl) {
		console.error("DATABASE_URL is not defined");
		process.exit(1);
	}

	const baseDbName = new URL(baseUrl).pathname.replace(/^\//, "");
	if (!baseDbName) {
		console.error("DATABASE_URL has no database name");
		process.exit(1);
	}

	const branch = getGitBranch();
	const branchDbName = buildDatabaseName(baseDbName, branch);
	const branchUrl = new URL(baseUrl);
	branchUrl.pathname = `/${branchDbName}`;

	await ensureDatabaseExists(baseUrl, baseDbName, branchDbName);

	if (commandArgs.length === 0) {
		process.stdout.write(branchUrl.toString());
		return;
	}

	const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
		stdio: "inherit",
		env: {
			...process.env,
			DATABASE_URL: branchUrl.toString(),
		},
	});
	process.exit(result.status ?? 0);
}

const isDirectRun = process.argv[1]?.includes("with-branch-db");
if (isDirectRun) {
	// Avoid executing when imported in tests.
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
