import { mockUsers } from "@/tests/mock";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useParams, usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { editPageStatusAction } from "./action";
import { EditHeader } from "./client";

// 外部システムのみモック（古典学派：モックは外部システムに限定）
vi.mock("./action");
vi.mock("next/navigation");
vi.mock("sonner", () => ({
	toast: { success: vi.fn() },
}));
vi.mock("next-intl", () => ({
	NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
		children,
	useTranslations: () => (key: string) => key,
}));
vi.mock("use-intl", () => ({
	useLocale: () => "en",
	useMessages: () => ({}),
	useTranslations: () => (id: string) => id,
}));

// useHeaderVisibilityが依存するDOM要素を準備（モックではなく実際のDOMを使用）
function setupScrollContainer() {
	const container = document.createElement("div");
	container.id = "root";
	container.style.height = "500px";
	container.style.overflow = "auto";
	document.body.appendChild(container);
	return container;
}

function cleanupScrollContainer() {
	const container = document.getElementById("root");
	if (container) {
		document.body.removeChild(container);
	}
}

// テスト用のデフォルトProps
const defaultProps = {
	currentUser: mockUsers[0],
	hasUnsavedChanges: false,
	initialStatus: "PUBLIC" as const,
	pageId: 123,
	targetLocales: ["en", "zh"],
};

beforeEach(() => {
	setupScrollContainer();
	vi.mocked(usePathname).mockReturnValue("/en/edit/page/123");
	vi.mocked(useParams).mockReturnValue({
		handle: "test-user",
		pageSlug: "test-page",
	} as unknown as ReturnType<typeof useParams>);
});

afterEach(() => {
	cleanupScrollContainer();
});

describe("EditHeader", () => {
	describe("保存ボタン", () => {
		it("未保存の変更がない場合_保存ボタンは無効になりチェックアイコンを表示する", () => {
			render(<EditHeader {...defaultProps} hasUnsavedChanges={false} />);

			const saveButton = screen.getByTestId("save-button");
			expect(saveButton).toBeDisabled();
			expect(screen.getByTestId("save-button-check")).toBeInTheDocument();
		});

		it("未保存の変更がある場合_保存ボタンは有効になりローディングアイコンを表示する", () => {
			render(<EditHeader {...defaultProps} hasUnsavedChanges={true} />);

			const saveButton = screen.getByTestId("save-button");
			expect(saveButton).not.toBeDisabled();
			expect(saveButton.querySelector(".animate-spin")).toBeTruthy();
		});
	});

	describe("ステータス表示", () => {
		it("PUBLICステータスの場合_Publicラベルを表示する", () => {
			render(<EditHeader {...defaultProps} initialStatus="PUBLIC" />);

			expect(screen.getByText("Public")).toBeInTheDocument();
		});

		it("DRAFTステータスの場合_Privateラベルを表示する", () => {
			render(<EditHeader {...defaultProps} initialStatus="DRAFT" />);

			expect(screen.getByText("Private")).toBeInTheDocument();
		});
	});

	describe("ステータス変更", () => {
		it("DRAFTからPublicボタンをクリックした場合_editPageStatusActionが呼び出される", async () => {
			vi.mocked(editPageStatusAction).mockResolvedValue({
				success: true,
				data: undefined,
			});

			render(<EditHeader {...defaultProps} initialStatus="DRAFT" />);

			// ポップオーバーを開く
			fireEvent.click(screen.getByText("Private"));
			// Publicボタンをクリック
			const publicButton = await screen.findByText("Public");
			fireEvent.click(publicButton);

			await waitFor(() => {
				expect(editPageStatusAction).toHaveBeenCalled();
			});
		});

		it("アクションがバリデーションエラーを返した場合_エラーメッセージを表示する", async () => {
			vi.mocked(editPageStatusAction).mockResolvedValue({
				success: false,
				zodErrors: { status: ["Invalid status"], pageId: ["Invalid pageId"] },
			});

			render(<EditHeader {...defaultProps} initialStatus="DRAFT" />);

			fireEvent.click(screen.getByText("Private"));
			const publicButton = await screen.findByText("Public");
			fireEvent.click(publicButton);

			expect(await screen.findByText("Invalid status")).toBeInTheDocument();
			expect(await screen.findByText("Invalid pageId")).toBeInTheDocument();
		});
	});
});
