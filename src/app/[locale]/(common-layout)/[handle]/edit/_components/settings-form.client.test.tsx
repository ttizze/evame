import { render, waitFor } from "@testing-library/react";
import { useActionState } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUsers } from "@/tests/mock";
import { SettingsForm } from "./settings-form";

vi.mock("react", async () => {
	const actual = await vi.importActual<typeof import("react")>("react");
	return {
		...actual,
		useActionState: vi.fn(),
	};
});
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SettingsForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("バリデーションエラーがあるとき_最初のメッセージをtoastで表示する", async () => {
		vi.mocked(useActionState)
			.mockReturnValueOnce([
				{
					success: false,
					zodErrors: { handle: ["このハンドルは使用できません"] },
				},
				vi.fn(),
				false,
			])
			.mockReturnValueOnce([{ success: false }, vi.fn(), false]);

		render(<SettingsForm currentUser={mockUsers[0]} />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("このハンドルは使用できません");
		});
	});
});
