import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ViewCycle } from "./view-cycle.client";

beforeEach(() => {
	window.history.replaceState({}, "", "/en/owner/scripture");
});

describe("ViewCycle", () => {
	test("URLの表示モードを読み、クリックでboth→user→sourceへ循環する", async () => {
		window.history.replaceState({}, "", "/en/owner/scripture?view=both");
		render(<ViewCycle sourceLocale="pi" userLocale="ja" />);
		const user = userEvent.setup();

		const both = screen.getByRole("button", { name: /Both languages/i });
		await user.click(both);
		expect(
			screen.getByRole("button", { name: /User language only/i }),
		).toBeInTheDocument();
		expect(window.location.search).toBe("?view=user");

		await user.click(
			screen.getByRole("button", { name: /User language only/i }),
		);
		expect(
			screen.getByRole("button", { name: /Source only/i }),
		).toBeInTheDocument();
	});

	test("クリック後にafterClickを通知する", async () => {
		const afterClick = vi.fn();
		render(
			<ViewCycle
				afterClick={afterClick}
				sourceLocale="mixed"
				userLocale="en"
			/>,
		);
		expect(screen.getByTestId("source-mixed-icon")).toBeInTheDocument();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: /Both languages/i }));
		expect(afterClick).toHaveBeenCalledOnce();
	});
});
