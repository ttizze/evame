import { createHash, randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateToken } from "@/app/api/_service/authenticate-token";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { getAppLogin, postAppLogin } from "./login/handler";
import { deleteAppToken, postAppToken } from "./token/handler";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/auth", () => ({
	getAuth: () => ({ api: { getSession: getSessionMock } }),
}));

await setupDbPerFile(import.meta.url);

const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const bearer = (token: string) =>
	new Request("http://localhost/api/app/documents", {
		headers: { Authorization: `Bearer ${token}` },
	});

describe("アプリのログイン", () => {
	let userId: string;

	beforeEach(async () => {
		await resetDatabase();
		await db
			.deleteFrom("verifications")
			.where("identifier", "like", "app-login:%")
			.execute();
		getSessionMock.mockReset();
		userId = (await createUser()).id;
	});

	const login = () =>
		getAppLogin(
			new Request(`http://localhost/api/app/login?code_challenge=${challenge}`),
		);
	const exchange = (code: string, codeVerifier = verifier) =>
		postAppToken(
			new Request("http://localhost/api/app/token", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code, code_verifier: codeVerifier }),
			}),
		);
	const loggedInCode = async () => {
		getSessionMock.mockResolvedValueOnce({ user: { id: userId } });
		const response = await postAppLogin(
			new Request("http://localhost/api/app/login", {
				method: "POST",
				headers: { Origin: "http://localhost" },
				body: new URLSearchParams({ code_challenge: challenge }),
			}),
		);
		const location = new URL(response.headers.get("location") ?? "");
		return location.searchParams.get("code") ?? "";
	};

	it("PKCEの値がなければ400を返す", async () => {
		const response = await getAppLogin(
			new Request("http://localhost/api/app/login"),
		);
		expect(response.status).toBe(400);
	});

	it("未ログインならWebのログイン画面へ送り、ログイン後に同じ要求へ戻す", async () => {
		getSessionMock.mockResolvedValueOnce(null);
		const response = await login();
		expect(response.status).toBe(307);
		const location = new URL(response.headers.get("location") ?? "");
		expect(location.pathname).toBe("/auth/login");
		expect(location.searchParams.get("next")).toBe(
			`/api/app/login?code_challenge=${challenge}`,
		);
	});

	it("ログイン済みでもGETではコードを発行せずアプリへの許可ボタンを表示する", async () => {
		getSessionMock.mockResolvedValueOnce({ user: { id: userId } });
		const response = await login();
		expect(response.status).toBe(200);
		expect(response.headers.get("location")).toBeNull();
		expect(await response.text()).toContain('method="post"');
		expect(
			await db
				.selectFrom("verifications")
				.select("id")
				.where("identifier", "like", "app-login:%")
				.execute(),
		).toHaveLength(0);
	});

	it("本人が許可するとトークンではなく一回限りのコードだけをアプリへ返す", async () => {
		const code = await loggedInCode();
		expect(code).not.toBe("");
	});

	it("別サイトからの許可POSTとOriginなしのPOSTではコードを発行しない", async () => {
		for (const origin of ["https://attacker.example", ""]) {
			getSessionMock.mockResolvedValue({ user: { id: userId } });
			const response = await postAppLogin(
				new Request("http://localhost/api/app/login", {
					method: "POST",
					headers: origin ? { Origin: origin } : {},
					body: new URLSearchParams({ code_challenge: challenge }),
				}),
			);
			expect(response.status).toBe(403);
		}
		expect(
			await db
				.selectFrom("verifications")
				.select("id")
				.where("identifier", "like", "app-login:%")
				.execute(),
		).toHaveLength(0);
	});

	it("日本語のブラウザーへ日本語の許可画面を返し共有キャッシュとiframe表示を禁止する", async () => {
		getSessionMock.mockResolvedValue({ user: { id: userId } });
		const response = await getAppLogin(
			new Request(
				`http://localhost/api/app/login?code_challenge=${challenge}`,
				{ headers: { "Accept-Language": "ja" } },
			),
		);
		expect(await response.text()).toContain("アプリにアクセスを許可");
		expect(response.headers.get("cache-control")).toContain("no-store");
		expect(response.headers.get("content-security-policy")).toContain(
			"frame-ancestors 'none'",
		);
	});

	it("許可POSTでも未ログインならコードを発行しない", async () => {
		getSessionMock.mockResolvedValueOnce(null);
		const response = await postAppLogin(
			new Request("http://localhost/api/app/login", {
				method: "POST",
				headers: { Origin: "http://localhost" },
				body: new URLSearchParams({ code_challenge: challenge }),
			}),
		);
		expect(response.status).toBe(401);
	});

	it("アプリへのコールバックは一回限りのコード以外の値を含めない", async () => {
		getSessionMock.mockResolvedValueOnce({ user: { id: userId } });
		const response = await postAppLogin(
			new Request("http://localhost/api/app/login", {
				method: "POST",
				headers: { Origin: "http://localhost" },
				body: new URLSearchParams({ code_challenge: challenge }),
			}),
		);
		const location = new URL(response.headers.get("location") ?? "");
		expect(`${location.protocol}//${location.host}${location.pathname}`).toBe(
			"evame-editor://auth",
		);
		expect([...location.searchParams.keys()]).toEqual(["code"]);
	});

	it("コードと元の乱数を送ると端末用トークンを返し、そのトークンで同期APIを使える", async () => {
		const response = await exchange(await loggedInCode());
		expect(response.status).toBe(200);
		const { token } = (await response.json()) as { token: string };
		expect(await authenticateToken(bearer(token))).toEqual({ userId });
		const tokens = await db
			.selectFrom("personalAccessTokens")
			.select("name")
			.where("userId", "=", userId)
			.execute();
		expect(tokens).toEqual([{ name: "iPhone" }]);
	});

	it("コードは一度しか使えない", async () => {
		const code = await loggedInCode();
		expect((await exchange(code)).status).toBe(200);
		expect((await exchange(code)).status).toBe(400);
	});

	it("元の乱数が違えばトークンを渡さず、コードも使えなくする", async () => {
		const code = await loggedInCode();
		expect(
			(await exchange(code, randomBytes(32).toString("base64url"))).status,
		).toBe(400);
		expect((await exchange(code)).status).toBe(400);
	});

	it("新しいコードを発行するときに、期限の切れたコードだけを消し、有効なコードは残す", async () => {
		await loggedInCode();
		await db
			.updateTable("verifications")
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.execute();
		const valid = await loggedInCode();
		await loggedInCode();
		const codes = await db
			.selectFrom("verifications")
			.select("expiresAt")
			.where("identifier", "like", "app-login:%")
			.execute();
		expect(codes).toHaveLength(2);
		expect((await exchange(valid)).status).toBe(200);
	});

	it("期限の切れたコードではトークンを渡さない", async () => {
		const code = await loggedInCode();
		await db
			.updateTable("verifications")
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.execute();
		expect((await exchange(code)).status).toBe(400);
	});

	it("ログアウトすると、その端末のトークンだけを失効させる", async () => {
		const first = (
			(await (await exchange(await loggedInCode())).json()) as { token: string }
		).token;
		const second = (
			(await (await exchange(await loggedInCode())).json()) as { token: string }
		).token;
		const response = await deleteAppToken(
			new Request("http://localhost/api/app/token", {
				method: "DELETE",
				headers: { Authorization: `Bearer ${first}` },
			}),
		);
		expect(response.status).toBe(204);
		expect(await authenticateToken(bearer(first))).toBeNull();
		expect(await authenticateToken(bearer(second))).toEqual({ userId });
	});
});
