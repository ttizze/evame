import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PageTree } from "./page-tree";

describe("originのpage treeを使った仏典階層表示", () => {
	it("現在の仏典を階層ツリーへ一度だけ表示する", async () => {
		const user = userEvent.setup();
		render(
			<PageTree
				hierarchy={["Sutta", "Dhammapada 1"]}
				locale="en"
				ownerHandle="tipitaka"
				slug="dhammapada-1"
				title="Dhammapada 1"
			/>,
		);

		await user.click(screen.getByRole("button", { name: "page tree" }));
		const tree = screen.getByRole("navigation", { name: "Page tree" });

		expect(within(tree).getAllByText("Dhammapada 1")).toHaveLength(1);
		expect(within(tree).getByRole("link", { name: "Sutta" })).toHaveAttribute(
			"href",
			"/en",
		);
		expect(
			within(tree).getByRole("link", { name: "Dhammapada 1" }),
		).toHaveAttribute("href", "/en/tipitaka/dhammapada-1");
	});
});
