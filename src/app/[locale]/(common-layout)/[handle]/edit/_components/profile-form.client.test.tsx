import { render, waitFor } from "@testing-library/react";
import { useActionState } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUsers } from "@/tests/mock";
import { ProfileForm } from "./profile-form";

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
vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: { updateUser: vi.fn() },
}));
vi.mock("next/image", () => ({
	__esModule: true,
	default: (props: { alt?: string; src?: string }) => {
		const { alt = "", src = "", ...rest } = props;
		return <span data-alt={alt} data-image="true" data-src={src} {...rest} />;
	},
}));

describe("ProfileForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("バリデーションエラーがあるとき_最初のメッセージをtoastで表示する", async () => {
		vi.mocked(useActionState)
			.mockReturnValueOnce([
				{ success: false, zodErrors: { name: ["名前が短すぎます"] } },
				vi.fn(),
				false,
			])
			.mockReturnValueOnce([
				{ success: true, data: { imageUrl: mockUsers[0].image } },
				vi.fn(),
				false,
			]);

		render(<ProfileForm currentUser={mockUsers[0]} />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("名前が短すぎます");
		});
	});
});
