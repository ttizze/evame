import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPersonalAccessToken,
	createSession,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { authenticateToken } from "./authenticate-token";

await setupDbPerFile(import.meta.url);

describe("authenticateToken", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("CLIログインの有効なセッショントークンでuserIdを返す", async () => {
		const user = await createUser();
		const session = await createSession({ userId: user.id });

		const request = new Request("http://localhost/api/sync/push", {
			headers: { Authorization: `Bearer ${session.token}` },
		});

		const result = await authenticateToken(request);
		expect(result).toEqual({ userId: user.id });
	});

	it("期限切れセッショントークンは認証失敗する", async () => {
		const user = await createUser();
		const expiresAt = new Date(Date.now() - 1000);
		const session = await createSession({ userId: user.id, expiresAt });

		const request = new Request("http://localhost/api/sync/push", {
			headers: { Authorization: `Bearer ${session.token}` },
		});

		const result = await authenticateToken(request);
		expect(result).toBeNull();
	});

	it("有効なPATでuserIdを返す", async () => {
		const user = await createUser();
		const { plainKey } = await createPersonalAccessToken({ userId: user.id });

		const request = new Request("http://localhost/api/sync/push", {
			headers: { Authorization: `Bearer ${plainKey}` },
		});

		const result = await authenticateToken(request);
		expect(result).toEqual({ userId: user.id });
	});

	it("無効なトークンは認証失敗する", async () => {
		const request = new Request("http://localhost/api/sync/push", {
			headers: { Authorization: "Bearer invalid-token" },
		});

		const result = await authenticateToken(request);
		expect(result).toBeNull();
	});

	it("Authorizationヘッダーがない場合は認証失敗する", async () => {
		const request = new Request("http://localhost/api/sync/push");
		const result = await authenticateToken(request);
		expect(result).toBeNull();
	});
});
