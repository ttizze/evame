import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { chromium, expect, webkit } from "@playwright/test";

export async function checkAppLogin(baseUrl, cookie) {
	for (const browserType of [chromium, webkit]) {
		const browser = await browserType.launch();
		try {
			const context = await browser.newContext({ locale: "ja-JP" });
			const separator = cookie.indexOf("=");
			await context.addCookies([
				{
					name: cookie.slice(0, separator),
					value: cookie.slice(separator + 1),
					url: baseUrl,
					httpOnly: true,
				},
			]);
			const page = await context.newPage();
			await page.addInitScript(() => {
				globalThis.appLoginPolicyViolations = [];
				document.addEventListener("securitypolicyviolation", (event) =>
					globalThis.appLoginPolicyViolations.push(event.effectiveDirective),
				);
			});
			const verifier = randomBytes(32).toString("base64url");
			const challenge = createHash("sha256")
				.update(verifier)
				.digest("base64url");
			const response = await page.goto(
				`${baseUrl}/api/app/login?code_challenge=${challenge}`,
			);
			assert.equal(response.status(), 200);
			await expect(
				page.getByRole("heading", { name: "アプリにアクセスを許可" }),
			).toBeVisible();
			await Promise.all([
				page.waitForRequest(
					(request) =>
						new URL(request.url()).pathname === "/api/app/login" &&
						request.method() === "POST",
				),
				page.getByRole("button", { name: "許可してアプリに戻る" }).click(),
			]);
			await page.evaluate(
				() =>
					new Promise((resolve) =>
						requestAnimationFrame(() => requestAnimationFrame(resolve)),
					),
			);
			assert.deepEqual(
				await page.evaluate(() => globalThis.appLoginPolicyViolations),
				[],
			);
			// OSのアプリはテストに接続しない。ネイティブ側のHTTP契約は別の許可要求で確認する。
			const allowed = await context.request.post(`${baseUrl}/api/app/login`, {
				form: { code_challenge: challenge },
				headers: { Origin: baseUrl },
				maxRedirects: 0,
			});
			assert.equal(allowed.status(), 303);
			const callback = new URL(allowed.headers().location);
			assert.equal(callback.protocol, "evame-editor:");
			const exchanged = await context.request.post(`${baseUrl}/api/app/token`, {
				data: {
					code: callback.searchParams.get("code"),
					code_verifier: verifier,
				},
			});
			assert.equal(exchanged.status(), 200);
			const { token } = await exchanged.json();
			const revoked = await context.request.delete(`${baseUrl}/api/app/token`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			assert.equal(revoked.status(), 204);
			console.log(
				`${browserType.name()}: 許可POST後にCSP違反がなく、PKCEコード交換と失効ができる`,
			);
		} finally {
			await browser.close();
		}
	}
}
