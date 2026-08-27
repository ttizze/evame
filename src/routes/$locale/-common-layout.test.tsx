import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommonLayout } from "@/app/[locale]/(common-layout)/layout";

describe("仏典画面の共通レイアウト", () => {
	it("origin/mainと同じヘッダー・本文・フッターの骨格を表示する", () => {
		render(
			<CommonLayout locale="en">
				<p>Scripture content</p>
			</CommonLayout>,
		);

		expect(screen.getByRole("banner")).toHaveClass(
			"rounded-b-3xl",
			"max-w-3xl",
			"py-2",
			"md:py-4",
		);
		expect(
			within(screen.getByRole("banner")).getByRole("link", {
				name: /Evame Logo/,
			}),
		).toHaveAttribute("href", "/en");
		expect(screen.getByRole("main")).toHaveClass(
			"mb-5",
			"mt-3",
			"grow",
			"tracking-wider",
		);
		expect(screen.getByRole("contentinfo")).toHaveClass("mt-auto", "h-60");
		const footer = screen.getByRole("contentinfo");
		expect(within(footer).getByRole("link", { name: "About" })).toHaveAttribute(
			"href",
			"/en/about",
		);
		expect(
			within(footer).getByRole("link", { name: "Privacy Policy" }),
		).toHaveAttribute("href", "/en/privacy");
		expect(
			within(footer).getByRole("link", { name: "Terms of Service" }),
		).toHaveAttribute("href", "/en/terms");
	});
});
