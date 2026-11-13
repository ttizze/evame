import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { afterEach, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { StartButton } from "./start-button";

const dialogLoaded = vi.hoisted(() => ({ count: 0 }));
vi.mock("./login/_components/login-dialog", async (importOriginal) => {
	dialogLoaded.count++;
	return importOriginal();
});
vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: { useSession: () => ({ data: null }) },
}));
vi.mock("./login/_components/google-form", () => ({ GoogleForm: () => null }));
vi.mock("./login/_components/magic-link-form", () => ({
	MagicLinkForm: () => <form aria-label="メールログイン" />,
}));
afterEach(cleanup);

it("ログインを押すまでフォームを読み込まず、閉じて再度開く操作も保つ", async () => {
	const user = userEvent.setup();
	render(
		<IntlProvider locale="ja" messages={messages.ja} timeZone="UTC">
			<StartButton compactOnMobile />
		</IntlProvider>,
	);
	expect(dialogLoaded.count).toBe(0);
	await user.click(screen.getByRole("button", { name: /ログイン/ }));
	expect(
		await screen.findByRole("form", { name: "メールログイン" }),
	).toBeVisible();
	expect(dialogLoaded.count).toBe(1);
	await user.keyboard("{Escape}");
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	await user.click(screen.getByRole("button", { name: /ログイン/ }));
	expect(
		await screen.findByRole("form", { name: "メールログイン" }),
	).toBeVisible();
	expect(dialogLoaded.count).toBe(1);
});
