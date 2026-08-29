import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUsers } from "@/tests/mock";
import { ProfileForm } from "./profile-form";

const { invalidateMock, updateProfileImageMock, updateProfileMock } =
	vi.hoisted(() => ({
		invalidateMock: vi.fn(),
		updateProfileImageMock: vi.fn(),
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
	updateProfileImage: updateProfileImageMock,
}));
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: { updateUser: vi.fn() },
}));

describe("ProfileForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateProfileMock.mockResolvedValue({
			success: false,
			zodErrors: { name: ["名前が短すぎます"] },
		});
	});

	it("バリデーションエラーがあるとき_最初のメッセージをtoastで表示する", async () => {
		render(<ProfileForm currentUser={mockUsers[0]} locale="en" />);

		const saveButton = screen.getByRole("button", { name: "Save" });
		const form = saveButton.closest("form");
		expect(form).not.toBeNull();
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("名前が短すぎます");
		});
	});
});
