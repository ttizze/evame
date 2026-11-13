import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProfileFollowIsland } from "./profile-follow";

const session = vi.hoisted(() => ({
	data: { user: { id: "alice", handle: "alice" } } as {
		user: { id: string; handle: string };
	} | null,
}));

vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: {
		useSession: () => ({ ...session, isPending: false }),
	},
}));
vi.mock("@/app/_hooks/use-hydrated", () => ({ useHydrated: () => true }));
vi.mock("swr", () => ({ default: () => ({ data: { isFollowing: true } }) }));

it("自分の公開ブログにはプロフィール編集への入口を出さない", () => {
	session.data = { user: { id: "alice", handle: "alice" } };
	render(<ProfileFollowIsland locale="ja" userId="alice" />);
	expect(screen.queryByRole("link", { name: "プロフィールを編集" })).toBeNull();
	expect(screen.queryByRole("button")).toBeNull();
});

it("他人のブログでは新着通知を解除できることを表示する", () => {
	session.data = { user: { id: "bob", handle: "bob" } };
	render(<ProfileFollowIsland locale="ja" userId="alice" />);
	expect(screen.getByRole("button", { name: "新着通知を解除" })).not.toBeNull();
	expect(screen.getByText("サイト内の通知でお知らせします。")).not.toBeNull();
});
