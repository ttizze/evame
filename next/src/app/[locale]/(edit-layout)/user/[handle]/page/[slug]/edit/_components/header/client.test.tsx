import { mockUsers } from "@/tests/mock";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
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

beforeEach(() => {
	vi.mocked(usePathname).mockReturnValue("/en/edit/page/123");
	vi.mocked(useHeaderVisibility).mockReturnValue({ isVisible: true });
});

describe("EditHeader Component", () => {
	it("renders save button and status correctly", () => {
		render(
			<NextIntlClientProvider locale="ja">
				<EditHeader
					currentUser={mockUsers[0]}
					initialStatus="PUBLIC"
					hasUnsavedChanges={false}
					pageId={123}
				/>
			</NextIntlClientProvider>,
		);

		expect(screen.getByTestId("save-button")).toBeDisabled();
		expect(screen.getByText("Public")).toBeInTheDocument();
	});

	it("shows loader icon when has unsaved changes", () => {
		render(
			<NextIntlClientProvider locale="ja">
				<EditHeader
					currentUser={mockUsers[0]}
					initialStatus="PUBLIC"
					hasUnsavedChanges={true}
					pageId={123}
				/>
			</NextIntlClientProvider>,
		);

		expect(screen.getByTestId("save-button")).not.toBeDisabled();
		expect(
			screen.getByTestId("save-button").querySelector(".animate-spin"),
		).toBeTruthy();
	});

	it("calls action and shows success toast on status change", async () => {
		vi.mocked(editPageStatusAction).mockResolvedValue({
			success: true,
			message: "Status updated!",
		});

		render(
			<NextIntlClientProvider locale="ja">
				<EditHeader
					currentUser={mockUsers[0]}
					initialStatus="DRAFT"
					hasUnsavedChanges={false}
					pageId={123}
				/>
			</NextIntlClientProvider>,
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
			<NextIntlClientProvider locale="ja">
				<EditHeader
					currentUser={mockUsers[0]}
					initialStatus="DRAFT"
					hasUnsavedChanges={false}
					pageId={123}
				/>
			</NextIntlClientProvider>,
		);

		fireEvent.click(screen.getByText("Private"));

		const publicButton = await screen.findByText("Public");
		fireEvent.click(publicButton);

		expect(await screen.findByText("Invalid status")).toBeInTheDocument();
		expect(await screen.findByText("Invalid pageId")).toBeInTheDocument();
	});
});
