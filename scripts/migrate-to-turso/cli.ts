import { runMigration, safeErrorMessage } from "./run";

function parsePositiveInteger(value: string): number {
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < 1) {
		throw new Error("batch size must be a positive integer");
	}
	return parsed;
}

function parseArguments(args: readonly string[]): {
	dryRun: boolean;
	batchSize?: number;
	rootSlug?: string;
} {
	let dryRun = false;
	let batchSize: number | undefined;
	let rootSlug: string | undefined;
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === "--dry-run") {
			dryRun = true;
			continue;
		}
		if (argument === "--batch-size") {
			const value = args[index + 1];
			if (!value) throw new Error("batch size value is required");
			batchSize = parsePositiveInteger(value);
			index += 1;
			continue;
		}
		if (argument === "--root-slug") {
			const value = args[index + 1]?.trim();
			if (!value) throw new Error("root slug value is required");
			rootSlug = value;
			index += 1;
			continue;
		}
		throw new Error("unknown migration option");
	}
	return { dryRun, batchSize, rootSlug };
}

export async function main(args: readonly string[] = process.argv.slice(2)) {
	const options = parseArguments(args);
	await runMigration({
		...options,
		stdout: (line) => console.log(line),
	});
}

if (process.argv[1]?.endsWith("/migrate-to-turso/cli.ts")) {
	void main().catch((error: unknown) => {
		console.error(safeErrorMessage(error));
		process.exitCode = 1;
	});
}
