import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { afterEach, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { LoginDialog } from "./login-dialog";

vi.mock("./google-form", () => ({
	GoogleForm: () => <button type="button">Google Login</button>,
}));
vi.mock("./magic-link-form", () => ({
	MagicLinkForm: () => <form aria-label="メールログイン" />,
}));

afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
});

it("メール専用のプレビューでは利用できないGoogleログインを表示しない", async () => {
	vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", "false");
	render(
		<IntlProvider locale="ja" messages={messages.ja}>
			<LoginDialog
				defaultOpen={false}
				trigger={<button type="button">ログイン</button>}
			/>
		</IntlProvider>,
	);
	await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
	expect(
		await screen.findByRole("form", { name: "メールログイン" }),
	).toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: "Google Login" }),
	).not.toBeInTheDocument();
});

it("通常環境ではGoogleとメールの両方のログインを維持する", async () => {
	vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", undefined);
	render(
		<IntlProvider locale="ja" messages={messages.ja}>
			<LoginDialog
				defaultOpen={false}
				trigger={<button type="button">ログイン</button>}
			/>
		</IntlProvider>,
	);
	await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
	expect(
		await screen.findByRole("button", { name: "Google Login" }),
	).toBeInTheDocument();
	expect(
		screen.getByRole("form", { name: "メールログイン" }),
	).toBeInTheDocument();
});

it("ログイン用URLでは操作を待たずにダイアログとフォームを開く", async () => {
	render(
		<IntlProvider locale="ja" messages={messages.ja}>
			<LoginDialog
				defaultOpen={true}
				trigger={<button type="button">ログイン</button>}
			/>
		</IntlProvider>,
	);
	expect(screen.getByRole("dialog")).toBeVisible();
	expect(
		await screen.findByRole("form", { name: "メールログイン" }),
	).toBeVisible();
});
