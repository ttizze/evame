// @vitest-environment node

import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { withQstashVerification } from "./with-qstash-signature";

const CURRENT_SIGNING_KEY = "qstash-current-signing-key-for-test";
const NEXT_SIGNING_KEY = "qstash-next-signing-key-for-test";
const INVALID_SIGNING_KEY = "qstash-invalid-signing-key-for-test";
const REQUEST_URL = "http://localhost/api/translate";

function setEnvironmentValue(name: string, value: string | undefined): void {
	if (value === undefined) {
		delete process.env[name];
		return;
	}

	process.env[name] = value;
}

async function withQstashSigningKeys<T>(
	currentSigningKey: string | undefined,
	nextSigningKey: string | undefined,
	callback: () => Promise<T>,
): Promise<T> {
	const originalCurrentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
	const originalNextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

	try {
		setEnvironmentValue("QSTASH_CURRENT_SIGNING_KEY", currentSigningKey);
		setEnvironmentValue("QSTASH_NEXT_SIGNING_KEY", nextSigningKey);
		return await callback();
	} finally {
		setEnvironmentValue(
			"QSTASH_CURRENT_SIGNING_KEY",
			originalCurrentSigningKey,
		);
		setEnvironmentValue("QSTASH_NEXT_SIGNING_KEY", originalNextSigningKey);
	}
}

async function createQstashSignature(
	body: string,
	signingKey: string,
): Promise<string> {
	const bodyHash = createHash("sha256").update(body).digest("base64url");

	return new SignJWT({ body: bodyHash })
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuer("Upstash")
		.sign(Buffer.from(signingKey));
}

function createRequest(body: string, signature?: string): Request {
	const headers = new Headers({ "content-type": "application/json" });
	if (signature !== undefined) {
		headers.set("upstash-signature", signature);
	}

	return new Request(REQUEST_URL, {
		method: "POST",
		headers,
		body,
	});
}

describe.sequential("withQstashVerification", () => {
	it("正しい署名ならhandlerが元のJSONボディを読み取れる", async () => {
		await withQstashSigningKeys(
			CURRENT_SIGNING_KEY,
			NEXT_SIGNING_KEY,
			async () => {
				const requestBody = {
					text: "テストする本文",
					locale: "ja",
				};
				const body = JSON.stringify(requestBody);
				const signature = await createQstashSignature(
					body,
					CURRENT_SIGNING_KEY,
				);
				let handlerExecutions = 0;
				const handler = async (request: Request): Promise<Response> => {
					handlerExecutions += 1;
					return Response.json(await request.json());
				};

				const response = await withQstashVerification(handler)(
					createRequest(body, signature),
				);

				expect(response.status).toBe(200);
				expect(await response.json()).toEqual(requestBody);
				expect(handlerExecutions).toBe(1);
			},
		);
	});

	it.each([
		{ name: "署名なし", signingKey: undefined },
		{ name: "不正な署名", signingKey: INVALID_SIGNING_KEY },
	])("$nameでは403となりhandlerを実行しない", async ({ signingKey }) => {
		await withQstashSigningKeys(
			CURRENT_SIGNING_KEY,
			NEXT_SIGNING_KEY,
			async () => {
				const body = JSON.stringify({ text: "認証が必要な本文" });
				const signature =
					signingKey === undefined
						? undefined
						: await createQstashSignature(body, signingKey);
				let handlerExecutions = 0;
				const handler = async (): Promise<Response> => {
					handlerExecutions += 1;
					return Response.json({ ok: true });
				};

				const response = await withQstashVerification(handler)(
					createRequest(body, signature),
				);

				expect(response.status).toBe(403);
				expect(handlerExecutions).toBe(0);
			},
		);
	});

	it("署名キー未設定ではwrapper作成時でなくrequest実行時に明確なエラーになる", async () => {
		await withQstashSigningKeys(undefined, undefined, async () => {
			const body = JSON.stringify({ text: "署名キー未設定" });
			let handlerExecutions = 0;
			const handler = async (): Promise<Response> => {
				handlerExecutions += 1;
				return Response.json({ ok: true });
			};
			let wrappedHandler:
				| ((request: Request, params?: unknown) => Promise<Response>)
				| undefined;

			expect(() => {
				wrappedHandler = withQstashVerification(handler);
			}).not.toThrow();
			expect(wrappedHandler).toBeDefined();

			if (wrappedHandler === undefined) {
				throw new Error("wrapper creation returned no handler");
			}
			await expect(wrappedHandler(createRequest(body))).rejects.toThrow(
				"QSTASH_CURRENT_SIGNING_KEY or QSTASH_NEXT_SIGNING_KEY are not set",
			);
			expect(handlerExecutions).toBe(0);
		});
	});
});
