import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import type { View } from "@/app/_context/display-provider";
import { ViewProvider } from "@/app/_context/display-provider";
import { ViewCycle } from "./view-cycle.client";

function Harness({
	initialSearchParams = "",
	initialView = "both",
	sourceLocale = "ja",
	userLocale = "en",
	afterClick,
}: {
	initialSearchParams?: string;
	initialView?: "user" | "source" | "both";
	sourceLocale?: string;
	userLocale?: string;
	afterClick?: () => void;
}) {
	return (
		<NuqsTestingAdapter searchParams={initialSearchParams}>
			<ViewProvider initialView={initialView}>
				<Suspense fallback={null}>
					<QueryStateReader />
					<ViewCycle
						afterClick={afterClick}
						sourceLocale={sourceLocale}
						userLocale={userLocale}
					/>
				</Suspense>
			</ViewProvider>
		</NuqsTestingAdapter>
	);
}

function QueryStateReader() {
	const [view] = useQueryState(
		"view",
		parseAsStringEnum<View>(["user", "source", "both"]),
	);
	return <span data-testid="view-query">{view ?? "none"}</span>;
}

describe("ViewCycle", () => {
	it("URL に view=source があると Source 表示になる", async () => {
		render(<Harness initialSearchParams="view=source" sourceLocale="mixed" />);

		await screen.findByRole("button", {
			name: /Source only/i,
		});
		expect(screen.getByTestId("source-mixed-icon")).toBeInTheDocument();
	});

	it("クリックで both→user→source→both に循環する", async () => {
		render(<Harness initialSearchParams="view=both" />);

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

	it("クリック時に afterClick が呼ばれる", async () => {
		const afterClick = vi.fn();
		render(<Harness afterClick={afterClick} />);

		const user = userEvent.setup();
		await user.click(
			await screen.findByRole("button", {
				name: /Both languages/i,
			}),
		);

		expect(afterClick).toHaveBeenCalledTimes(1);
	});

	it("クリックで URL の view が更新される", async () => {
		render(<Harness initialSearchParams="view=both" />);

		const user = userEvent.setup();

		await user.click(
			await screen.findByRole("button", {
				name: /Both languages/i,
			}),
		);

		await waitFor(() => {
			expect(screen.getByTestId("view-query").textContent).toBe("user");
		});
	});
});
