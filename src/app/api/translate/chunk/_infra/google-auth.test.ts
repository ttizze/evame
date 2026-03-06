import { afterEach, describe, expect, it } from "vitest";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const originalEnv = { ...process.env };

describe("getGoogleAuthOptions", () => {
	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("Cloudflare secret の base64 JSON から GoogleAuthOptions を組み立てる", async () => {
		process.env.GCP_PROJECT_ID = "evame-project";
		process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_BASE64 = Buffer.from(
			JSON.stringify({
				type: "service_account",
				project_id: "evame-project",
				private_key_id: "key-id",
				private_key:
					"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
				client_email: "vertex@evame-project.iam.gserviceaccount.com",
				client_id: "1234567890",
				token_uri: "https://oauth2.googleapis.com/token",
			}),
		).toString("base64");

		const { getGoogleAuthOptions } = await import("./google-auth");

		expect(getGoogleAuthOptions()).toMatchObject({
			projectId: "evame-project",
			scopes: [CLOUD_PLATFORM_SCOPE],
			credentials: {
				project_id: "evame-project",
				client_email: "vertex@evame-project.iam.gserviceaccount.com",
			},
		});
	});

	it("secret がなくても ADC 用の projectId と scopes は返す", async () => {
		process.env.GCP_PROJECT_ID = "evame-project";
		delete process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_BASE64;
		delete process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_JSON;

		const { getGoogleAuthOptions } = await import("./google-auth");

		expect(getGoogleAuthOptions()).toEqual({
			projectId: "evame-project",
			scopes: [CLOUD_PLATFORM_SCOPE],
		});
	});
});
