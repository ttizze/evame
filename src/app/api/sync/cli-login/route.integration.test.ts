import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createSession, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { GET } from "./route";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/auth", () => ({
	auth: {
		api: {
			getSession: getSessionMock,
		},
	},
}));

await setupDbPerFile(import.meta.url);

describe("CLI Login API", () => {
	beforeEach(async () => {
		await resetDatabase();
		getSessionMock.mockReset();
	});

	it("redirect_uri が不正な場合は400を返す", async () => {
		const response = await GET(
			new Request(
				"http://localhost/api/sync/cli-login?redirect_uri=https://evil.com/callback",
			),
		);
		expect(response.status).toBe(400);
	});

	it("未ログインの場合は /auth/login にリダイレクトする", async () => {
		const callback = encodeURIComponent("http://127.0.0.1:45678/callback");
		getSessionMock.mockResolvedValueOnce(null);
		const response = await GET(
			new Request(
				`http://localhost/api/sync/cli-login?redirect_uri=${callback}`,
			),
		);
		expect(response.status).toBe(307);
		const location = response.headers.get("location");
		expect(location).toBeTruthy();
		expect(location).toContain("/auth/login?");
		expect(location).toContain("next=");
	});

	it("ログイン済みならlocalhost callbackにトークンを渡してリダイレクトする", async () => {
		const user = await createUser();
		const session = await createSession({ userId: user.id });
		const callback = encodeURIComponent("http://127.0.0.1:45678/callback");
		getSessionMock.mockResolvedValueOnce({ session: { id: session.id } });

		const response = await GET(
			new Request(
				`http://localhost/api/sync/cli-login?redirect_uri=${callback}`,
			),
		);

		expect(response.status).toBe(307);
		const location = response.headers.get("location");
		expect(location).toBeTruthy();
		const url = new URL(location!);
		expect(url.origin).toBe("http://127.0.0.1:45678");
		expect(url.pathname).toBe("/callback");
		expect(url.searchParams.get("token")).toBe(session.token);
	});
});
