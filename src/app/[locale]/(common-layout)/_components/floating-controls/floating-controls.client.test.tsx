import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DisplayProvider } from "@/app/_context/display-provider";
import { FloatingControls } from "./floating-controls.client";

vi.mock("../../user/[handle]/page/[pageSlug]/_components/share-dialog", () => ({
	ShareDialog: () => null,
}));

vi.mock("../hooks/use-scroll-visibility", () => ({
	useScrollVisibility: () => ({
		isVisible: true,
		ignoreNextScroll: vi.fn(),
	}),
}));

function Harness({
	annotationTypes = [],
	initialMode,
	initialSearchParams = "",
	sourceLocale = "ja",
	userLocale = "en",
}: {
	annotationTypes?: Array<{ key: string; label: string }>;
	initialMode?: "user" | "source" | "both";
	initialSearchParams?: string;
	sourceLocale?: string;
	userLocale?: string;
}) {
	return (
		<NuqsTestingAdapter searchParams={initialSearchParams}>
			<DisplayProvider initialMode={initialMode}>
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
});

describe("FloatingControls", () => {
	it("条件: sourceLocale=mixed / 行動: 初期表示 / 結果: MIXED が表示される", async () => {
		render(<Harness initialMode="source" sourceLocale="mixed" />);

		await screen.findByRole("button", {
			name: /Source only/i,
		});
		expect(screen.getByText("MIXED")).toBeInTheDocument();
	});

	it("条件: displayMode=Both / 行動: クリック / 結果: Both→User→Source→Bothへ循環する", async () => {
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

	it("条件: 注釈ボタン / 行動: クリック / 結果: data-annotations が更新される", async () => {
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
});
