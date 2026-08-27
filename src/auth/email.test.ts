import { describe, expect, it, vi } from "vitest";
import { sendMagicLinkEmail } from "./email";

describe("Resend HTTPメール送信", () => {
	it("Resend APIへ認証ヘッダーとリンクを送る", async () => {
		const fetchMock = vi.fn<typeof fetch>(
			async () =>
				new Response(JSON.stringify({ id: "email-id" }), { status: 200 }),
		);

		await sendMagicLinkEmail({
			apiKey: "resend-secret",
			from: "Digital Buddhism <noreply@example.com>",
			email: "person@example.com",
			link: "https://evame.example/api/auth/magic-link/verify?token=opaque",
			fetchImpl: fetchMock,
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(url).toBe("https://api.resend.com/emails");
		expect(new Headers(init?.headers).get("authorization")).toBe(
			"Bearer resend-secret",
		);
		const body = JSON.parse(String(init?.body)) as {
			to: string[];
			subject: string;
			html: string;
		};
		expect(body.to).toEqual(["person@example.com"]);
		expect(body.subject).toBe("Your Digital Buddhism sign-in link");
		expect(body.html).toContain(
			"Use this link to sign in to Digital Buddhism:",
		);
		expect(body.html).toContain(
			"If you did not request this email, you can ignore it.",
		);
		expect(body.html).toContain(
			"https://evame.example/api/auth/magic-link/verify?token=opaque",
		);
	});

	it("Resendの失敗時にAPIレスポンスの秘密を例外へ含めない", async () => {
		const fetchMock = vi.fn<typeof fetch>(
			async () => new Response("secret provider details", { status: 500 }),
		);

		await expect(
			sendMagicLinkEmail({
				apiKey: "resend-secret",
				from: "Digital Buddhism <noreply@example.com>",
				email: "person@example.com",
				link: "https://evame.example/api/auth/magic-link/verify?token=opaque",
				fetchImpl: fetchMock,
			}),
		).rejects.toThrow("メール送信に失敗しました");
	});
});
