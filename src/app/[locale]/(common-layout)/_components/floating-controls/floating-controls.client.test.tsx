import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingControls } from "./floating-controls.client";

vi.mock("./share-dialog", () => ({
	ShareDialog: () => null,
}));

vi.mock("./hooks/use-scroll-visibility", () => ({
	useScrollVisibility: () => ({
		isVisible: true,
		ignoreNextScroll: vi.fn(),
	}),
}));

function Harness({
	initialSearchParams = "",
	sourceLocale = "ja",
	userLocale = "en",
}: {
	initialSearchParams?: string;
	sourceLocale?: string;
	userLocale?: string;
}) {
	return (
		<NuqsTestingAdapter searchParams={initialSearchParams}>
			<FloatingControls sourceLocale={sourceLocale} userLocale={userLocale} />
		</NuqsTestingAdapter>
	);
}

beforeEach(() => {
	delete document.documentElement.dataset.annotations;
});

describe("FloatingControls", () => {
	it("sourceLocale が mixed の時、URLクエリでsourceを指定すると Original が表示される", async () => {
		render(<Harness initialSearchParams="view=source" sourceLocale="mixed" />);

		await screen.findByRole("button", {
			name: /Source only/i,
		});
		expect(screen.getByTestId("source-mixed-icon")).toBeInTheDocument();
	});

	it("view が both の時、クリックすると both→user→source→both に循環する", async () => {
		render(<Harness />);

		const user = userEvent.setup();

		await screen.findByRole("button", {
			name: /Both languages/i,
		});

		await user.click(
			await screen.findByRole("button", {
				name: /Both languages/i,
			}),
		);
		await screen.findByRole("button", {
			name: /User language only/i,
		});

		await user.click(
			await screen.findByRole("button", {
				name: /User language only/i,
			}),
		);
		await screen.findByRole("button", {
			name: /Source only/i,
		});

		await user.click(
			await screen.findByRole("button", {
				name: /Source only/i,
			}),
		);
		await screen.findByRole("button", {
			name: /Both languages/i,
		});
	});

	it("URLクエリでviewを指定すると、その値で初期表示される", async () => {
		render(<Harness initialSearchParams="view=user" />);

		await screen.findByRole("button", {
			name: /User language only/i,
		});
	});
	it("注釈クエリが残っていても注釈表示状態を設定しない", async () => {
		render(<Harness initialSearchParams="annotations=Atthakatha" />);
		await screen.findByRole("button", { name: /Both languages/i });
		expect(document.documentElement.dataset.annotations).toBeUndefined();
	});
});
