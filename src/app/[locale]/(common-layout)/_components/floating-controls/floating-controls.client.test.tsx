import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { FloatingControls } from "./floating-controls.client";

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
	likeButton,
}: {
	initialSearchParams?: string;
	sourceLocale?: string;
	userLocale?: keyof typeof messages;
	likeButton?: React.ReactNode;
}) {
	return (
		<IntlProvider locale={userLocale} messages={messages[userLocale]}>
			<NuqsTestingAdapter searchParams={initialSearchParams}>
				<FloatingControls
					likeButton={likeButton}
					sourceLocale={sourceLocale}
					userLocale={userLocale}
				/>
			</NuqsTestingAdapter>
		</IntlProvider>
	);
}

beforeEach(() => {
	delete document.documentElement.dataset.annotations;
});

describe("FloatingControls", () => {
	it("View・Like・Shareの文字を表示せず、言語表示といいね操作を維持する", async () => {
		const onLike = vi.fn();
		render(
			<Harness
				likeButton={
					<button aria-label="Like" onClick={onLike} type="button">
						<svg aria-hidden="true" />
					</button>
				}
			/>,
		);
		await screen.findByRole("button", { name: /Both languages/i });
		for (const label of ["View", "Like", "Share"]) {
			expect(screen.queryByText(label, { exact: true })).toBeNull();
		}
		expect(screen.getByText("JA", { exact: true })).toBeVisible();
		expect(screen.getByText("EN", { exact: true })).toBeVisible();
		await userEvent.setup().click(screen.getByRole("button", { name: "Like" }));
		expect(onLike).toHaveBeenCalledOnce();
	});

	it.each([
		["ja", "共有"],
		["en", "Share"],
		["es", "Compartir"],
		["ko", "공유"],
		["zh", "分享"],
	] as const)(
		"%sで共有アイコンをEnterで開き、Escapeで閉じられる",
		async (locale, label) => {
			render(<Harness userLocale={locale} />);
			const user = userEvent.setup();
			const share = screen.getByRole("button", { name: label });
			expect(share.textContent).toBe("");
			expect(screen.getAllByRole("button")).toHaveLength(2);
			share.focus();
			await user.keyboard("{Enter}");
			expect(
				await screen.findByRole("dialog", { name: "Share" }),
			).toBeVisible();
			await user.keyboard("{Escape}");
			expect(screen.queryByRole("dialog")).toBeNull();
			expect(share).toHaveFocus();
		},
	);

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
