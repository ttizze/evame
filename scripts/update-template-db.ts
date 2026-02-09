import { Client } from "pg";

function escapeIdentifier(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

function getDatabaseName(databaseUrl: string): string {
	const name = new URL(databaseUrl).pathname.replace(/^\//, "");
	if (!name) {
		throw new Error("DATABASE_URL has no database name");
	}
	return name;
}

async function recreateTemplateDatabaseFromBase(
	databaseUrl: string,
	templateName: string,
	baseDatabaseName: string,
): Promise<void> {
	const adminUrl = new URL(databaseUrl);
	adminUrl.pathname = "/postgres";
	const client = new Client({ connectionString: adminUrl.toString() });
	await client.connect();
	try {
		await client.query(
			"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
			[baseDatabaseName],
		);
		await client.query(
			"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
			[templateName],
		);
		await client.query(
			`DROP DATABASE IF EXISTS ${escapeIdentifier(templateName)}`,
		);
		await client.query(
			`CREATE DATABASE ${escapeIdentifier(templateName)} WITH TEMPLATE ${escapeIdentifier(baseDatabaseName)}`,
		);
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

	const baseDatabaseName = getDatabaseName(baseUrl);
	if (templateName === baseDatabaseName) {
		console.error(
			"DB_TEMPLATE_NAME must be different from DATABASE_URL database",
		);
		process.exit(1);
	}

	await recreateTemplateDatabaseFromBase(
		baseUrl,
		templateName,
		baseDatabaseName,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
