import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	ClientOnly: ({ children }: { children: ReactNode }) => children,
	useLocation: () => ({
		pathname: "/ja/auth/login",
		searchStr: "?next=%2Fja%2Fsource",
	}),
}));

import LoginPage from "./page";

describe("origin配置のログインpage", () => {
	it("origin/mainのログインdialogの構成と文言を表示する", () => {
		const { container } = render(<LoginPage />);

		expect(container.firstElementChild).toHaveClass(
			"container",
			"mx-auto",
			"max-w-md",
			"py-8",
		);
		expect(screen.getByText("Login to Evame")).toBeVisible();
		expect(
			screen.getByText("Evame is multilingual blog platform."),
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Google Login" })).toBeVisible();
		expect(screen.getByText("Or continue with email")).toBeVisible();
		expect(screen.getByLabelText("Email")).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Terms of Service" }),
		).toHaveAttribute("href", "/ja/terms");
	});
});
