import { fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { beforeEach, expect, it, vi } from "vitest";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { messages } from "@/i18n/messages";
import { MagicLinkForm } from "./magic-link-form";

vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: { signIn: { magicLink: vi.fn() } },
}));
beforeEach(() => {
	vi.mocked(authClient.signIn.magicLink).mockReset();
});

it("認証APIがエラーを返した場合はメール送信成功にせず、再試行できる", async () => {
	vi.mocked(authClient.signIn.magicLink)
		.mockResolvedValueOnce({
			data: null,
			error: {
				status: 500,
				statusText: "Internal Server Error",
				message: "Sending failed",
			},
		})
		.mockResolvedValueOnce({ data: { status: true }, error: null });
	render(
		<IntlProvider locale="ja" messages={messages.ja}>
			<MagicLinkForm redirectTo="/ja" />
		</IntlProvider>,
	);
	fireEvent.change(screen.getByLabelText("Email"), {
		target: { value: "writer@example.test" },
	});
	fireEvent.click(await screen.findByRole("button", { name: "Send Email" }));
	expect(
		await screen.findByText(
			"ログインメールを送信できませんでした。もう一度お試しください。",
		),
	).toBeInTheDocument();
	expect(
		screen.queryByText("Email sent successfully!"),
	).not.toBeInTheDocument();
	fireEvent.click(await screen.findByRole("button", { name: "Send Email" }));
	expect(
		await screen.findByText("Email sent successfully!"),
	).toBeInTheDocument();
	expect(
		screen.queryByText(
			"ログインメールを送信できませんでした。もう一度お試しください。",
		),
	).not.toBeInTheDocument();
});

it.each([
	["ja", "ログインメールを送信できませんでした。もう一度お試しください。"],
	["en", "Failed to send magic link. Please try again."],
	["es", "No se pudo enviar el correo de acceso. Inténtalo de nuevo."],
	["ko", "로그인 이메일을 보내지 못했습니다. 다시 시도해 주세요."],
	["zh", "登录邮件发送失败，请重试。"],
] as const)(
	"%sでメール送信の通信が失敗した場合は翻訳されたエラーを表示する",
	async (locale, message) => {
		vi.mocked(authClient.signIn.magicLink).mockRejectedValue(
			new Error("offline"),
		);
		render(
			<IntlProvider locale={locale} messages={messages[locale]}>
				<MagicLinkForm redirectTo={`/${locale}`} />
			</IntlProvider>,
		);
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "writer@example.test" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Send Email" }));
		expect(await screen.findByText(message)).toBeInTheDocument();
	},
);

it("不正なメールアドレスの送信では日本語の入力エラーを表示してAPIを呼ばない", async () => {
	render(
		<IntlProvider locale="ja" messages={messages.ja}>
			<MagicLinkForm redirectTo="/ja" />
		</IntlProvider>,
	);
	fireEvent.change(screen.getByLabelText("Email"), {
		target: { value: "invalid" },
	});
	fireEvent.submit(
		screen.getByRole("button", { name: "Send Email" }).closest("form")!,
	);
	expect(
		await screen.findByText("有効なメールアドレスを入力してください。"),
	).toBeInTheDocument();
	expect(authClient.signIn.magicLink).not.toHaveBeenCalled();
});
