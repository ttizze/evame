import { mockUsers } from "@/tests/mock";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editPageStatusAction } from "./action";
import { EditHeader } from "./client";
import { useHeaderVisibility } from "./hooks/use-header-visibility";
vi.mock("./action");
vi.mock("next/navigation");
vi.mock("./hooks/use-header-visibility");
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
	},
}));
vi.mock("next-intl", () => ({
	NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
		children,
	useTranslations: () => (key: string) => key,
}));
vi.mock("use-intl", async () => {
	const React = await vi.importActual<typeof import("react")>("react");

	// ダミー値
	const DUMMY = { locale: "en", messages: {} };

	// Context 自体を自前で作って渡す
	const IntlContext = React.createContext(DUMMY);

	return {
		IntlContext,

		// Provider: children をそのまま返す or Context.Provider を使う
		IntlProvider: ({ children }: { children: React.ReactNode }) => (
			<IntlContext.Provider value={DUMMY}>{children}</IntlContext.Provider>
		),

		// フックは何でも返すダミーでOK
		useLocale: () => "en",
		useMessages: () => ({}),
		useTranslations: () => (id: string) => id,
	};
});
beforeEach(() => {
	vi.mocked(usePathname).mockReturnValue("/en/edit/page/123");
	vi.mocked(useHeaderVisibility).mockReturnValue({ isVisible: true });
});

describe("EditHeader Component", () => {
	it("renders save button and status correctly", () => {
		render(
			<EditHeader
				currentUser={mockUsers[0]}
				initialStatus="PUBLIC"
				hasUnsavedChanges={false}
				pageId={123}
			/>,
		);

		expect(screen.getByTestId("save-button")).toBeDisabled();
		expect(screen.getByText("Public")).toBeInTheDocument();
	});

	it("shows loader icon when has unsaved changes", () => {
		render(
			<EditHeader
				currentUser={mockUsers[0]}
				initialStatus="PUBLIC"
				hasUnsavedChanges={true}
				pageId={123}
			/>,
		);

		expect(screen.getByTestId("save-button")).not.toBeDisabled();
		expect(
			screen.getByTestId("save-button").querySelector(".animate-spin"),
		).toBeTruthy();
	});

	it("calls action and shows success toast on status change", async () => {
		vi.mocked(editPageStatusAction).mockResolvedValue({
			success: true,
			data: undefined,
			message: "Status updated!",
		});

		render(
			<EditHeader
				currentUser={mockUsers[0]}
				initialStatus="DRAFT"
				hasUnsavedChanges={false}
				pageId={123}
			/>,
		);

		fireEvent.click(screen.getByText("Private"));

		const publicButton = await screen.findByText("Public");
		fireEvent.click(publicButton);

		await waitFor(() => expect(editPageStatusAction).toHaveBeenCalled());
	});

	it("renders error messages from action state", async () => {
		vi.mocked(editPageStatusAction).mockResolvedValue({
			success: false,
			zodErrors: { status: ["Invalid status"], pageId: ["Invalid pageId"] },
		});

		render(
			<EditHeader
				currentUser={mockUsers[0]}
				initialStatus="DRAFT"
				hasUnsavedChanges={false}
				pageId={123}
			/>,
		);

		fireEvent.click(screen.getByText("Private"));

		const publicButton = await screen.findByText("Public");
		fireEvent.click(publicButton);

		expect(await screen.findByText("Invalid status")).toBeInTheDocument();
		expect(await screen.findByText("Invalid pageId")).toBeInTheDocument();
	});
});
