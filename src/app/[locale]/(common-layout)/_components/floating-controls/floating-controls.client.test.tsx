import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { FloatingControls } from "./floating-controls.client";

beforeEach(() => {
	window.history.replaceState({}, "", "/en/owner/scripture");
	delete document.documentElement.dataset.annotations;
});

describe("FloatingControls", () => {
	test("注釈の表示状態をURLとdata属性へ反映する", async () => {
		render(
			<FloatingControls
				annotationTypes={[
					{ key: "COMMENTARY", label: "Commentary" },
					{ key: "NOTE", label: "Note" },
				]}
				sourceLocale="pi"
				userLocale="ja"
			/>,
		);
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Commentary" }));
		expect(document.documentElement.dataset.annotations).toBe("Commentary");
		expect(window.location.search).toBe("?annotations=Commentary");

		await user.click(screen.getByRole("button", { name: "Note" }));
		expect(document.documentElement.dataset.annotations).toBe(
			"Commentary Note",
		);
	});
});
