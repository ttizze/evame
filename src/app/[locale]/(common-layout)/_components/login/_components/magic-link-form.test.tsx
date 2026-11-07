import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { MagicLinkForm } from "./magic-link-form";

vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: { signIn: { magicLink: vi.fn() } },
}));
beforeEach(() => {
	vi.mocked(authClient.signIn.magicLink).mockReset();
});

it("認証APIがエラーを返した場合はメール送信成功にせず、再試行できる", async () => {
	vi.mocked(authClient.signIn.magicLink)
		.mockResolvedValueOnce({
			data: null,
			error: {
				status: 500,
				statusText: "Internal Server Error",
				message: "Sending failed",
			},
		})
		.mockResolvedValueOnce({ data: { status: true }, error: null });
	render(<MagicLinkForm redirectTo="/ja" />);
	fireEvent.change(screen.getByLabelText("Email"), {
		target: { value: "writer@example.test" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Send Email" }));
	expect(
		await screen.findByText("Failed to send magic link. Please try again."),
	).toBeInTheDocument();
	expect(
		screen.queryByText("Email sent successfully!"),
	).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Send Email" }));
	expect(
		await screen.findByText("Email sent successfully!"),
	).toBeInTheDocument();
	expect(
		screen.queryByText("Failed to send magic link. Please try again."),
	).not.toBeInTheDocument();
});

it("メール送信時の通信が失敗した場合は未処理の例外を残さずエラーを表示する", async () => {
	vi.mocked(authClient.signIn.magicLink).mockRejectedValue(
		new Error("offline"),
	);
	render(<MagicLinkForm redirectTo="/ja" />);
	fireEvent.change(screen.getByLabelText("Email"), {
		target: { value: "writer@example.test" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Send Email" }));
	expect(
		await screen.findByText("Failed to send magic link. Please try again."),
	).toBeInTheDocument();
});
