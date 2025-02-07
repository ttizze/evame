import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

// Mock useActionState
vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useActionState: () => [
			{ error: "" },
			vi.fn(),
			false, // isPending
		],
	};
});

import { FollowButton } from "./follow-button";

describe("FollowButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("displays 'Follow' when isFollowing is false", () => {
		render(<FollowButton targetUserId="2" isFollowing={false} />);
		expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
	});

	it("displays 'Following' when isFollowing is true", () => {
		render(<FollowButton targetUserId="2" isFollowing={true} />);
		expect(
			screen.getByRole("button", { name: "Following" }),
		).toBeInTheDocument();
	});

	it("renders with custom className when provided", () => {
		render(
			<FollowButton
				targetUserId="2"
				isFollowing={false}
				className="custom-class"
			/>,
		);
		expect(screen.getByRole("button")).toHaveClass("custom-class");
	});
});
