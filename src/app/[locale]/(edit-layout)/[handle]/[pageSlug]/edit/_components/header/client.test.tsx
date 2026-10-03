import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockUsers } from "@/tests/mock";
import { EditHeader } from "./client";

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
	isSaving: false,
	locale: "en",
	pageId: 123,
	pageSlug: "test-page",
	targetLocales: ["en", "zh"],
	translationContexts: [],
};

beforeEach(setupScrollContainer);
afterEach(cleanupScrollContainer);

describe("EditHeader", () => {
	it("未保存の変更がない場合、保存ボタンを無効にしてチェックを表示する", () => {
		render(<EditHeader {...defaultProps} />);
		expect(screen.getByTestId("save-button")).toBeDisabled();
		expect(screen.getByTestId("save-button-check")).toBeInTheDocument();
	});

	it("未保存の変更がある場合、保存ボタンを有効にしてローディング表示にする", () => {
		render(<EditHeader {...defaultProps} hasUnsavedChanges />);
		expect(screen.getByTestId("save-button")).not.toBeDisabled();
		expect(
			screen.getByTestId("save-button").querySelector(".animate-spin"),
		).toBeTruthy();
	});

	it("PUBLICステータスの場合、Publicラベルを表示する", () => {
		render(<EditHeader {...defaultProps} initialStatus="PUBLIC" />);
		expect(screen.getByText("Public")).toBeInTheDocument();
	});

	it("DRAFTステータスの場合、Privateラベルを表示する", () => {
		render(<EditHeader {...defaultProps} initialStatus="DRAFT" />);
		expect(screen.getByText("Private")).toBeInTheDocument();
	});
});
