import { describe, expect, it, vi } from "vitest";
import { UnauthenticatedError } from "@/domain/errors";
import type { Auth } from "./auth";
import { getSession, getSessionUser, requireSessionUser } from "./session";

function testAuth(result: Awaited<ReturnType<Auth["api"]["getSession"]>>): {
	auth: Auth;
	getSession: ReturnType<typeof vi.fn>;
} {
	const getSession = vi.fn(async () => result);
	return {
		auth: { api: { getSession } } as unknown as Auth,
		getSession,
	};
}

describe("Better Authセッション境界", () => {
	it("リクエストHeadersをBetter Authへそのまま渡し、検証済みユーザーを返す", async () => {
		const user = {
			id: "user-1",
			email: "user@example.com",
			name: "User",
		};
		const { auth, getSession: readSession } = testAuth({ user } as never);
		const request = new Request("https://example.test/ja", {
			headers: { cookie: "digital_buddhism_session=opaque-value" },
		});

		await expect(getSessionUser(request, auth)).resolves.toEqual(user);
		expect(readSession).toHaveBeenCalledWith({ headers: request.headers });
	});

	it("改ざんされたCookieを認証済みとして扱わず、保護操作を拒否する", async () => {
		const { auth } = testAuth(null);
		const request = new Request("https://example.test/ja", {
			headers: { cookie: "digital_buddhism_session=tampered-value" },
		});

		await expect(getSession(request, auth)).resolves.toBeNull();
		await expect(requireSessionUser(request, auth)).rejects.toBeInstanceOf(
			UnauthenticatedError,
		);
	});
});
