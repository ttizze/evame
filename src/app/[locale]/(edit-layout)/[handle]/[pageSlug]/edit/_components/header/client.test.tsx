import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { mockUsers } from "@/tests/mock";
import { EditHeader } from "./client";

const { commentsAction, statusAction } = vi.hoisted(() => ({
	commentsAction: vi.fn(),
	statusAction: vi.fn(),
}));
vi.mock("@/app/_service/reader-action", () => ({
	callReaderAction: commentsAction,
}));
vi.mock("./action", () => ({ editPageStatus: statusAction }));
vi.mock("@tanstack/react-start", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-start")>()),
	useServerFn: (fn: unknown) => fn,
}));
const wrapper = ({ children }: { children: ReactNode }) => (
	<IntlProvider locale="en" messages={messages.en}>
		{children}
	</IntlProvider>
);

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
	useLocation: () => ({ hash: "", pathname: "/en/test-user/test-page/edit" }),
	useNavigate: () => vi.fn(),
	useParams: () => ({ locale: "en", pageSlug: "test-page" }),
}));

function setupScrollContainer() {
	const container = document.createElement("div");
	container.id = "root";
	container.style.height = "500px";
	container.style.overflow = "auto";
	document.body.appendChild(container);
}

function cleanupScrollContainer() {
	const container = document.getElementById("root");
	if (container) document.body.removeChild(container);
}

const defaultProps = {
	currentUser: mockUsers[0],
	handle: "test-user",
	hasUnsavedChanges: false,
	initialStatus: "PUBLIC" as const,
	initialCommentsEnabled: true,
	isSaving: false,
	locale: "en",
	pageId: 123,
	pageSlug: "test-page",
	targetLocales: ["en", "zh"],
	translationContexts: [],
};

beforeEach(setupScrollContainer);
beforeEach(() => {
	commentsAction.mockReset();
	statusAction.mockReset().mockResolvedValue({ success: true });
});
afterEach(cleanupScrollContainer);

describe("EditHeader", () => {
	it.each(["PUBLIC", "DRAFT"] as const)(
		"公開設定の見出しを省き、%sでも閲覧リンクは既存のプレビューとして表示する",
		async (initialStatus) => {
			const user = userEvent.setup();
			render(<EditHeader {...defaultProps} initialStatus={initialStatus} />, {
				wrapper,
			});
			await user.click(
				screen.getByRole("button", {
					name: `Publication settings: ${initialStatus === "PUBLIC" ? "Public" : "Private"}`,
				}),
			);
			expect(screen.getByRole("link", { name: "Preview" })).toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: "Publication settings" }),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("dialog", { name: "Publication settings" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("link", { name: "View page" }),
			).not.toBeInTheDocument();
		},
	);
	it("未保存の変更がない場合、保存ボタンを無効にしてチェックを表示する", () => {
		render(<EditHeader {...defaultProps} />, { wrapper });
		expect(screen.getByTestId("save-button")).toBeDisabled();
		expect(screen.getByTestId("save-button-check")).toBeInTheDocument();
	});

	it("未保存の変更がある場合、保存ボタンを有効にしてローディング表示にする", () => {
		render(<EditHeader {...defaultProps} hasUnsavedChanges />, { wrapper });
		expect(screen.getByTestId("save-button")).not.toBeDisabled();
		expect(
			screen.getByTestId("save-button").querySelector(".animate-spin"),
		).toBeTruthy();
	});

	it("PUBLICステータスの場合、Publicラベルを表示する", () => {
		render(<EditHeader {...defaultProps} initialStatus="PUBLIC" />, {
			wrapper,
		});
		expect(screen.getByText("Public")).toBeInTheDocument();
	});

	it("DRAFTステータスの場合、Privateラベルを表示する", () => {
		render(<EditHeader {...defaultProps} initialStatus="DRAFT" />, { wrapper });
		expect(screen.getByText("Private")).toBeInTheDocument();
	});
	it("コメント受付を変更している間は二重送信を防ぎ、成功した設定を表示する", async () => {
		const user = userEvent.setup();
		let resolve!: (value: unknown) => void;
		commentsAction.mockReturnValue(
			new Promise((done) => {
				resolve = done;
			}),
		);
		render(<EditHeader {...defaultProps} />, { wrapper });
		await user.click(
			screen.getByRole("button", { name: "Publication settings: Public" }),
		);
		const control = screen.getByRole("switch", { name: "Allow comments" });
		await user.click(control);
		expect(control).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Publication settings: Saving…" }),
		).toBeDisabled();
		expect(commentsAction).toHaveBeenCalledWith("pageComments", {
			pageId: 123,
			enabled: false,
			locale: "en",
		});
		resolve({ success: true, data: { commentsEnabled: false } });
		await waitFor(() => {
			expect(control).not.toBeChecked();
			expect(control).toBeEnabled();
		});
	});
	it("コメント設定の保存に失敗したら元のON表示を保ち、再試行できる", async () => {
		const user = userEvent.setup();
		commentsAction.mockRejectedValue(new Error("offline"));
		render(<EditHeader {...defaultProps} />, { wrapper });
		await user.click(
			screen.getByRole("button", { name: "Publication settings: Public" }),
		);
		const control = screen.getByRole("switch", { name: "Allow comments" });
		await user.click(control);
		await waitFor(() => expect(control).toBeEnabled());
		expect(control).toBeChecked();
	});
	it("公開前はPublishを表示し、未保存の変更があると公開と翻訳を待つ", async () => {
		const user = userEvent.setup();
		render(
			<EditHeader {...defaultProps} hasUnsavedChanges initialStatus="DRAFT" />,
			{ wrapper },
		);
		await user.click(
			screen.getByRole("button", { name: "Publication settings: Private" }),
		);
		expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Translate" })).toBeDisabled();
	});
	it("公開を選ぶと従来の公開・翻訳アクションへ選択言語を渡す", async () => {
		const user = userEvent.setup();
		render(<EditHeader {...defaultProps} initialStatus="DRAFT" />, { wrapper });
		await user.click(
			screen.getByRole("button", { name: "Publication settings: Private" }),
		);
		await user.click(screen.getByRole("button", { name: "Publish" }));
		await waitFor(() => expect(statusAction).toHaveBeenCalledOnce());
		const form = statusAction.mock.calls[0][0].data as FormData;
		expect(form.get("status")).toBe("PUBLIC");
		expect(form.get("targetLocales")).toBe("en,zh");
	});
	it("リンクをコピーすると表示言語と記事のURLをクリップボードへ渡す", async () => {
		const user = userEvent.setup();
		const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
		render(<EditHeader {...defaultProps} />, { wrapper });
		await user.click(
			screen.getByRole("button", { name: "Publication settings: Public" }),
		);
		await user.click(screen.getByRole("button", { name: "Copy link" }));
		expect(copy).toHaveBeenCalledWith(
			`${window.location.origin}/en/test-user/test-page`,
		);
	});
});
