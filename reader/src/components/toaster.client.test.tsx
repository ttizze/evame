import { expect, it, vi } from "vitest";
import { setReaderTheme } from "../theme.client";
import { acquireToaster } from "./toaster.client";

vi.mock("@/components/ui/sonner", () => ({
	Toaster: ({ theme }: { theme: string }) => <div data-toast-theme={theme} />,
}));

it("複数のislandで通知を重複させず、テーマへ追従し、最後のislandが外れたら破棄する", async () => {
	const releaseFirst = acquireToaster();
	const releaseSecond = acquireToaster();
	try {
		expect(document.querySelectorAll("[data-reader-toaster]")).toHaveLength(1);
		setReaderTheme("dark");
		await vi.waitFor(() =>
			expect(
				document.querySelector<HTMLElement>("[data-toast-theme]")?.dataset
					.toastTheme,
			).toBe("dark"),
		);
		releaseFirst();
		await Promise.resolve();
		expect(document.querySelectorAll("[data-reader-toaster]")).toHaveLength(1);
	} finally {
		releaseSecond();
		await vi.waitFor(() =>
			expect(document.querySelector("[data-reader-toaster]")).toBeNull(),
		);
		setReaderTheme("light");
		localStorage.clear();
	}
});
