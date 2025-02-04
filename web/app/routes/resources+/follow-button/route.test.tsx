// route.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

// テスト対象より前にモックを定義
vi.mock("@remix-run/react", () => ({
	// ここでは useFetcher だけをモック化
	useFetcher: () => ({
		state: "idle",
		submit: vi.fn(),
		Form: ({ children }: { children: React.ReactNode }) => (
			<form>{children}</form>
		),
	}),
}));

import { FollowButton } from "./route";

describe("FollowButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("displays 'Follow' when isFollowing is false", () => {
		render(<FollowButton targetUserId={"2"} isFollowing={false} />);
		expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
	});

	it("displays 'Following' when isFollowing is true", () => {
		render(<FollowButton targetUserId={"2"} isFollowing={true} />);
		expect(
			screen.getByRole("button", { name: "Following" }),
		).toBeInTheDocument();
	});
});
