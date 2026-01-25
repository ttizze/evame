import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DisplayMode } from "@/app/_context/display-provider";
import { DisplayProvider } from "@/app/_context/display-provider";
import { DisplayModeCycle } from "./display-mode-cycle.client";

function Harness({
	initialSearchParams = "",
	initialMode = "both",
	sourceLocale = "ja",
	userLocale = "en",
	afterClick,
}: {
	initialSearchParams?: string;
	initialMode?: "user" | "source" | "both";
	sourceLocale?: string;
	userLocale?: string;
	afterClick?: () => void;
}) {
	return (
		<NuqsTestingAdapter searchParams={initialSearchParams}>
			<DisplayProvider initialMode={initialMode}>
				<Suspense fallback={null}>
					<QueryStateReader />
					<DisplayModeCycle
						afterClick={afterClick}
						sourceLocale={sourceLocale}
						userLocale={userLocale}
					/>
				</Suspense>
			</DisplayProvider>
		</NuqsTestingAdapter>
	);
}

function QueryStateReader() {
	const [mode] = useQueryState(
		"displayMode",
		parseAsStringEnum<DisplayMode>(["user", "source", "both"]),
	);
	return <span data-testid="display-mode-query">{mode ?? "none"}</span>;
}

describe("DisplayModeCycle", () => {
	it("URL に displayMode=source があると Source 表示になる", async () => {
		render(
			<Harness initialSearchParams="displayMode=source" sourceLocale="mixed" />,
		);

		await screen.findByRole("button", {
			name: /Source only/i,
		});
		expect(screen.getByTestId("source-mixed-icon")).toBeInTheDocument();
	});

	it("クリックで both→user→source→both に循環する", async () => {
		render(<Harness initialSearchParams="displayMode=both" />);

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

	it("クリックで URL の displayMode が更新される", async () => {
		render(<Harness initialSearchParams="displayMode=both" />);

		const user = userEvent.setup();

		await user.click(
			await screen.findByRole("button", {
				name: /Both languages/i,
			}),
		);

		await waitFor(() => {
			expect(screen.getByTestId("display-mode-query").textContent).toBe("user");
		});
	});
});
