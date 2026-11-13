import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HeaderUserSlot } from "./user-slot.client";

const state = vi.hoisted(() => ({ loggedIn: false, menuLoads: 0 }));
vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: {
		useSession: () => ({
			isPending: false,
			data: state.loggedIn
				? {
						user: {
							handle: "alice",
							name: "Alice",
							image: "",
							plan: "free",
							hasGeminiApiKey: false,
						},
					}
				: null,
		}),
	},
}));
vi.mock("./user-menu.client", () => {
	state.menuLoads++;
	return { UserMenu: () => <button type="button">アカウント</button> };
});
vi.mock("./locale-selector/client", () => ({ LocaleSelector: () => null }));
vi.mock("../start-button", () => ({ StartButton: () => null }));
vi.mock("./new-page-button", () => ({ NewPageButton: () => null }));
vi.mock("./translation-help-popover.client", () => ({
	TranslationHelpPopover: () => null,
}));

it("未ログインならアカウントメニューを読み込まず、ログインが分かってから表示する", async () => {
	const { rerender } = render(<HeaderUserSlot locale="ja" />);
	expect(state.menuLoads).toBe(0);
	state.loggedIn = true;
	rerender(<HeaderUserSlot locale="ja" />);
	expect(
		await screen.findByRole("button", { name: "アカウント" }),
	).toBeVisible();
	expect(state.menuLoads).toBe(1);
});
