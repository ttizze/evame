import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Client } from "pg";

const migrationSqlPattern = /^src\/drizzle\/\d+_[^/]+\.sql$/;
const migrationSnapshotPattern = /^src\/drizzle\/meta\/\d+_snapshot\.json$/;
const migrationJournalPath = "src/drizzle/meta/_journal.json";
const diffBaseCandidates = ["origin/main", "origin/master", "main", "master"];

function escapeIdentifier(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

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

export function isMigrationArtifactPath(filePath: string): boolean {
	return (
		migrationSqlPattern.test(filePath) ||
		migrationSnapshotPattern.test(filePath) ||
		filePath === migrationJournalPath
	);
}

export function hasMigrationArtifactChanges(
	filePaths: readonly string[],
): boolean {
	return filePaths.some((filePath) => isMigrationArtifactPath(filePath));
}

function runGitLines(args: string[]): string[] {
	const result = spawnSync("git", args, {
		encoding: "utf8",
	});
	if (result.status !== 0) {
		return [];
	}
	return (result.stdout || "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function resolveDiffBaseRef(): string | null {
	for (const candidate of diffBaseCandidates) {
		const result = spawnSync("git", ["rev-parse", "--verify", candidate], {
			encoding: "utf8",
			stdio: ["ignore", "ignore", "ignore"],
		});
		if (result.status === 0) {
			return candidate;
		}
	}
	return null;
}

function collectChangedDrizzlePaths(): string[] {
	const changedPaths = new Set<string>();
	const diffBaseRef = resolveDiffBaseRef();

	if (diffBaseRef) {
		for (const filePath of runGitLines([
			"diff",
			"--name-only",
			`${diffBaseRef}...HEAD`,
			"--",
			"src/drizzle",
		])) {
			changedPaths.add(filePath);
		}
	}

	for (const filePath of runGitLines([
		"diff",
		"--name-only",
		"HEAD",
		"--",
		"src/drizzle",
	])) {
		changedPaths.add(filePath);
	}

	for (const filePath of runGitLines([
		"ls-files",
		"--others",
		"--exclude-standard",
		"--",
		"src/drizzle",
	])) {
		changedPaths.add(filePath);
	}

	return [...changedPaths];
}

export async function ensureDatabaseExists(
	databaseUrl: string,
	targetName: string,
	templateName: string,
): Promise<void> {
	// Create branch DB from template DB using admin connection.
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
				`CREATE DATABASE ${escapeIdentifier(targetName)} WITH TEMPLATE ${escapeIdentifier(templateName)}`,
			);
		}
	} finally {
		await client.end();
	}
}

async function main(): Promise<void> {
	// Require DATABASE_URL and run target command with branch DB injected.
	const commandArgs = process.argv.slice(2);
	if (process.env.DB_BRANCH_MODE !== "1") {
		console.error("DB_BRANCH_MODE=1 is required for branch DB commands");
		process.exit(1);
	}
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

	const templateDbName = process.env.DB_TEMPLATE_NAME?.trim() || baseDbName;
	const shouldUseBranchDb = hasMigrationArtifactChanges(
		collectChangedDrizzlePaths(),
	);
	const resolvedDatabaseUrl = shouldUseBranchDb
		? (() => {
				const branch = getGitBranch();
				const branchDbName = buildDatabaseName(baseDbName, branch);
				const branchUrl = new URL(baseUrl);
				branchUrl.pathname = `/${branchDbName}`;
				return branchUrl.toString();
			})()
		: baseUrl;

	if (shouldUseBranchDb) {
		const targetDbName = new URL(resolvedDatabaseUrl).pathname.replace(
			/^\//,
			"",
		);
		await ensureDatabaseExists(baseUrl, targetDbName, templateDbName);
	}

	if (commandArgs.length === 0) {
		process.stdout.write(resolvedDatabaseUrl);
		return;
	}

	const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
		stdio: "inherit",
		env: {
			...process.env,
			DATABASE_URL: resolvedDatabaseUrl,
		},
	});
	if (result.error) {
		console.error(result.error);
		process.exit(1);
	}
	if (result.status === null) {
		if (result.signal) {
			console.error(`Command terminated by signal ${result.signal}`);
		}
		process.exit(1);
	}
	process.exit(result.status);
}

const isDirectRun = process.argv[1]?.includes("with-branch-db");
if (isDirectRun) {
	// Avoid executing when imported in tests.
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
