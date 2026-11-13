import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { ShareDialog } from "./share-dialog";

const sharePackage = vi.hoisted(() => ({ loads: 0 }));
vi.mock("react-share", () => {
	sharePackage.loads++;
	const ShareButton = ({ children }: { children: ReactNode }) => (
		<button type="button">{children}</button>
	);
	return {
		FacebookShareButton: ShareButton,
		RedditShareButton: ShareButton,
		TwitterShareButton: ShareButton,
		FacebookIcon: () => <span>Facebook</span>,
		RedditIcon: () => <span>Reddit</span>,
	};
});
vi.mock("nuqs", async (importOriginal) => ({
	...(await importOriginal<typeof import("nuqs")>()),
	useQueryState: () => ["both"],
}));

it("Shareを押すまでSNSのライブラリを読み込まず、最初のクリックで共有先を開く", async () => {
	const user = userEvent.setup();
	render(<ShareDialog />);
	expect(sharePackage.loads).toBe(0);
	await user.click(screen.getByRole("button"));
	expect(await screen.findByRole("dialog", { name: "Share" })).toBeVisible();
	expect(await screen.findByText("Facebook")).toBeVisible();
	expect(sharePackage.loads).toBe(1);
});
