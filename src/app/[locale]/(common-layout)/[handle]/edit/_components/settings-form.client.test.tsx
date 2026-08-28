import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUsers } from "@/tests/mock";
import { SettingsForm } from "./settings-form";

const { invalidateMock, updateProfileMock } = vi.hoisted(() => ({
	invalidateMock: vi.fn(),
	updateProfileMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: invalidateMock }),
}));
vi.mock("@tanstack/react-start", () => ({
	useServerFn: (serverFn: unknown) => serverFn,
}));
vi.mock("@/routes/$locale/-profile-edit-data", () => ({
	updateProfile: updateProfileMock,
}));
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock(
	"@/app/[locale]/(common-layout)/_components/gemini-api-key-dialog/gemini-api-key-dialog",
	() => ({ GeminiApiKeyDialog: () => null }),
);

describe("SettingsForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateProfileMock.mockResolvedValue({
			success: false,
			zodErrors: { handle: ["このハンドルは使用できません"] },
		});
	});

	it("バリデーションエラーがあるとき_最初のメッセージをtoastで表示する", async () => {
		render(<SettingsForm currentUser={mockUsers[0]} locale="en" />);

		const saveButton = screen.getByRole("button", { name: "Save" });
		const form = saveButton.closest("form");
		expect(form).not.toBeNull();
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("このハンドルは使用できません");
		});
	});
});
