import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DisplayProvider } from "@/app/_context/display-provider";
import { FloatingControls } from "./floating-controls.client";

vi.mock("./share-dialog", () => ({
	ShareDialog: () => null,
}));

vi.mock("../hooks/use-scroll-visibility", () => ({
	useScrollVisibility: () => ({
		isVisible: true,
		ignoreNextScroll: vi.fn(),
	}),
}));

const cookieStoreValues = new Map<string, string>();
const cookieStoreMock = {
	get: vi.fn(async (name: string) => {
		const value = cookieStoreValues.get(name);
		return value ? { name, value } : undefined;
	}),
	set: vi.fn(async ({ name, value }: { name: string; value: string }) => {
		cookieStoreValues.set(name, value);
	}),
};

function Harness({
	annotationTypes = [],
	initialSearchParams = "",
	sourceLocale = "ja",
	userLocale = "en",
}: {
	annotationTypes?: Array<{ key: string; label: string }>;
	initialSearchParams?: string;
	sourceLocale?: string;
	userLocale?: string;
}) {
	return (
		<NuqsTestingAdapter searchParams={initialSearchParams}>
			<DisplayProvider>
				<FloatingControls
					annotationTypes={annotationTypes}
					sourceLocale={sourceLocale}
					userLocale={userLocale}
				/>
			</DisplayProvider>
		</NuqsTestingAdapter>
	);
}

beforeEach(() => {
	delete document.documentElement.dataset.annotations;
	cookieStoreValues.clear();
	cookieStoreMock.get.mockClear();
	cookieStoreMock.set.mockClear();
	Object.defineProperty(window, "cookieStore", {
		value: cookieStoreMock,
		writable: true,
	});
});

describe("FloatingControls", () => {
	it("sourceLocale が mixed の時、初期表示で Original が表示される", async () => {
		cookieStoreValues.set("displayMode", "source");
		render(<Harness sourceLocale="mixed" />);

		await screen.findByRole("button", {
			name: /Source only/i,
		});
		expect(screen.getByTestId("source-mixed-icon")).toBeInTheDocument();
	});

	it("displayMode が both の時、クリックすると both→user→source→both に循環する", async () => {
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

	it("注釈ボタンをクリックすると data-annotations が更新される", async () => {
		render(
			<Harness
				annotationTypes={[
					{ key: "COMMENT", label: "Commentary" },
					{ key: "NOTE", label: "Note" },
				]}
			/>,
		);

		const user = userEvent.setup();

		expect(document.documentElement.dataset.annotations).toBeUndefined();

		await user.click(await screen.findByRole("button", { name: "Commentary" }));
		expect(document.documentElement.dataset.annotations).toBe("Commentary");

		await user.click(await screen.findByRole("button", { name: "Note" }));
		expect(document.documentElement.dataset.annotations).toBe(
			"Commentary Note",
		);

		await user.click(await screen.findByRole("button", { name: "Commentary" }));
		expect(document.documentElement.dataset.annotations).toBe("Note");
	});

	it("displayMode が both の時、ページ遷移してもモードが維持される", async () => {
		const { rerender } = render(<Harness />);

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

		await waitFor(() => {
			expect(cookieStoreMock.set).toHaveBeenCalled();
		});

		rerender(<Harness />);

		await screen.findByRole("button", {
			name: /User language only/i,
		});
	});
});
