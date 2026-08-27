import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthClient } from "./google-auth";

const { getClient, googleAuth } = vi.hoisted(() => ({
	getClient: vi.fn(),
	googleAuth: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
	GoogleAuth: vi.fn(function GoogleAuth(options) {
		googleAuth(options);
		return { getClient };
	}),
}));

describe("getAuthClient", () => {
	beforeEach(() => {
		delete process.env.GCP_SERVICE_ACCOUNT_KEY;
		delete process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_BASE64;
		getClient.mockReset();
		googleAuth.mockReset();
		getClient.mockResolvedValue("auth-client");
	});

	it("GCP_SERVICE_ACCOUNT_KEY があれば JSON を認証情報として使う", async () => {
		process.env.GCP_SERVICE_ACCOUNT_KEY = JSON.stringify({
			client_email: "worker@example.test",
			private_key: "secret",
		});

		await expect(getAuthClient()).resolves.toBe("auth-client");

		expect(googleAuth).toHaveBeenCalledWith({
			credentials: {
				client_email: "worker@example.test",
				private_key: "secret",
			},
			scopes: ["https://www.googleapis.com/auth/cloud-platform"],
		});
	});

	it("GCP_SERVICE_ACCOUNT_KEY がなければ既存の Base64 secret を認証情報として使う", async () => {
		process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_BASE64 = btoa(
			JSON.stringify({
				client_email: "base64@example.test",
				private_key: "encoded-secret",
			}),
		);

		await expect(getAuthClient()).resolves.toBe("auth-client");

		expect(googleAuth).toHaveBeenCalledWith({
			credentials: {
				client_email: "base64@example.test",
				private_key: "encoded-secret",
			},
			scopes: ["https://www.googleapis.com/auth/cloud-platform"],
		});
	});

	it("どちらの secret もなければ ADC に任せるため undefined を返す", async () => {
		await expect(getAuthClient()).resolves.toBeUndefined();

		expect(googleAuth).not.toHaveBeenCalled();
	});
});
