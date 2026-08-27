import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

vi.mock("@/auth/client", () => ({
	authClient: {
		getSession: state.getSession,
		signOut: vi.fn(),
	},
}));

import { HeaderUserSlot } from "./user-slot.client";

describe("ヘッダーの認証ユーザースロット", () => {
	it("未認証では現在localeのログイン導線とlocale selectorを表示する", async () => {
		state.getSession.mockResolvedValue({ data: null, error: null });

		render(<HeaderUserSlot locale="ja" />);

		expect(
			await screen.findByTestId("locale-selector-button"),
		).toBeInTheDocument();
		expect(await screen.findByRole("link", { name: /Start/ })).toHaveAttribute(
			"href",
			"/ja/auth/login?next=%2F",
		);
	});

	it("認証済みではユーザー名とhandleを持つ旧相当メニューを表示する", async () => {
		state.getSession.mockResolvedValue({
			data: {
				user: {
					handle: "alice",
					name: "Alice",
					image: null,
					plan: "free",
				},
			},
			error: null,
		});

		render(<HeaderUserSlot locale="en" />);

		expect(
			await screen.findByRole("button", { name: "Alice" }),
		).toBeInTheDocument();
	});
});
