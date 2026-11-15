import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { TestProject } from "vitest/node";
import { prepareTestDatabase } from "../../scripts/test-database.mjs";

declare module "vitest" {
	export interface ProvidedContext {
		testDatabasePath: string;
	}
}

export default async function setup(project: TestProject) {
	await mkdir(resolve(".data/tests"), { recursive: true });
	const directory = await mkdtemp(resolve(".data/tests/template-"));
	try {
		const path = join(directory, "empty.db");
		await prepareTestDatabase(path, false);
		project.provide("testDatabasePath", path);
		project.onTestsRerun(async () => {
			await rm(path);
			await prepareTestDatabase(path, false);
		});
	} catch (error) {
		await rm(directory, { recursive: true, force: true });
		throw error;
	}
	return () => rm(directory, { recursive: true, force: true });
}
