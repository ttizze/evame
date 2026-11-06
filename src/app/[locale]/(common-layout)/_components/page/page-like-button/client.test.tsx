import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig, useSWRConfig } from "swr";
import { expect, it, vi } from "vitest";
import { PageLikeButtonClient } from "./client";

vi.mock("@/app/_hooks/use-hydrated", () => ({ useHydrated: () => true }));
function RefreshLikeState() {
	const { mutate } = useSWRConfig();
	return (
		<button
			onClick={() =>
				void mutate(
					"/api/page-likes/state?ids=42",
					{ states: { "42": { liked: true, likeCount: 7 } } },
					false,
				)
			}
			type="button"
		>
			サーバーのいいね情報を反映
		</button>
	);
}
it("記事1件のいいね情報を取得した後も、件数と選択状態が表示される", async () => {
	render(
		<SWRConfig value={{ provider: () => new Map() }}>
			<PageLikeButtonClient initialLikeCount={0} pageId={42} showCount={true} />
			<RefreshLikeState />
		</SWRConfig>,
	);
	fireEvent.click(
		screen.getByRole("button", { name: "サーバーのいいね情報を反映" }),
	);
	await waitFor(() => expect(screen.getByText("7")).toBeVisible());
	expect(
		screen.getByRole("button", { name: "Like" }).querySelector("svg"),
	).toHaveAttribute("fill", "currentColor");
});
