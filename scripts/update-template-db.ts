import { spawnSync } from "node:child_process";
import { Client } from "pg";

function escapeIdentifier(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

function runCommand(
	command: string,
	args: string[],
	env: NodeJS.ProcessEnv,
): void {
	const result = spawnSync(command, args, {
		stdio: "inherit",
		env,
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
	if (result.status !== 0) {
		process.exit(result.status);
	}
}

async function ensureTemplateDatabaseExists(
	databaseUrl: string,
	templateName: string,
): Promise<void> {
	const adminUrl = new URL(databaseUrl);
	adminUrl.pathname = "/postgres";
	const client = new Client({ connectionString: adminUrl.toString() });
	await client.connect();
	try {
		const exists = await client.query(
			"SELECT 1 FROM pg_database WHERE datname = $1",
			[templateName],
		);
		if (exists.rowCount === 0) {
			await client.query(`CREATE DATABASE ${escapeIdentifier(templateName)}`);
		}
	} finally {
		await client.end();
	}
}

async function main(): Promise<void> {
	const baseUrl = process.env.DATABASE_URL;
	if (!baseUrl) {
		console.error("DATABASE_URL is not defined");
		process.exit(1);
	}
	const templateName = process.env.DB_TEMPLATE_NAME?.trim();
	if (!templateName) {
		console.error("DB_TEMPLATE_NAME is not defined");
		process.exit(1);
	}

	await ensureTemplateDatabaseExists(baseUrl, templateName);

	const templateUrl = new URL(baseUrl);
	templateUrl.pathname = `/${templateName}`;

	const commandEnv = {
		...process.env,
		DATABASE_URL: templateUrl.toString(),
	};

	runCommand("drizzle-kit", ["migrate"], commandEnv);
	runCommand("tsx", ["src/db/seed.ts"], commandEnv);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
