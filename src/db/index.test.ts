import { afterEach, describe, expect, it, vi } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(async () => {
	process.env.DATABASE_URL = originalDatabaseUrl;
	delete globalThis.__kyselyDb;
	delete globalThis.__kyselyDbConnectionString;
	vi.resetModules();
	vi.unmock("@neondatabase/serverless");
});

describe("Cloudflare向けDB接続", () => {
	it("リモートDBではアクセスごとに新しいPoolを使う", async () => {
		const createdPools: unknown[] = [];

		vi.doMock("@neondatabase/serverless", () => {
			return {
				Pool: class MockNeonPool {
					constructor(_options: unknown) {
						createdPools.push(this);
					}
				},
			};
		});

		process.env.DATABASE_URL = "postgres://user:pass@ep-test.neon.tech/main";

		const { db } = await import("./index");

		const firstPool = db.pool;
		const secondPool = db.pool;

		expect(firstPool).not.toBe(secondPool);
		expect(createdPools).toHaveLength(2);
	});
});
