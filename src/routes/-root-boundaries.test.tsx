import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	RootErrorComponent,
	RootNotFoundComponent,
	RoutePendingComponent,
} from "./-root-boundaries";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
		to,
	}: {
		children: ReactNode;
		params?: { locale?: string };
		to: string;
	}) => (
		<a
			href={
				to.startsWith("/$locale")
					? to.replace("/$locale", `/${params?.locale}`)
					: to
			}
		>
			{children}
		</a>
	),
}));

vi.mock("@sentry/tanstackstart-react", () => ({
	captureException: vi.fn(),
}));

describe("TanStack Startのroot境界UI", () => {
	it("エラー内容を表示し、再試行とホーム遷移を提供する", async () => {
		const reset = vi.fn();
		const user = userEvent.setup();

		render(
			<RootErrorComponent
				error={new Error("読み込みに失敗しました")}
				reset={reset}
			/>,
		);

		expect(screen.getByText("Error")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
			"href",
			"/",
		);

		await user.click(screen.getByRole("button", { name: "Try again" }));
		expect(reset).toHaveBeenCalledOnce();
	});

	it.each([
		null,
		"読み込み失敗",
		42,
	])("Error以外の値 %s が投げられてもエラー画面を表示する", (error) => {
		render(<RootErrorComponent error={error} reset={vi.fn()} />);
		expect(screen.getByText("Error")).toBeInTheDocument();
	});

	it("404画面に英語ホームと検索へのリンクを表示する", () => {
		render(<RootNotFoundComponent />);

		expect(screen.getByText("404")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute(
			"href",
			"/en",
		);
		expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute(
			"href",
			"/en/search",
		);
	});

	it("保留中はspinnerを使わず画面上端の進捗バーを表示する", () => {
		render(<RoutePendingComponent />);

		const progress = screen.getByRole("progressbar");
		expect(progress).toHaveAttribute("aria-label", "Loading");
		expect(progress.querySelector("svg")).toBeNull();
	});
});
