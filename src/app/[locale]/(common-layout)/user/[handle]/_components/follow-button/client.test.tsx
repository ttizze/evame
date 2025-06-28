import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { getCurrentUser } from "@/auth";
import { mockUsers } from "@/tests/mock";
import { FollowButtonClient } from "./client";

vi.mock("@/auth");

describe("FollowButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
	});

	it("displays 'Follow' when isFollowing is false", () => {
		render(<FollowButtonClient isFollowing={false} targetUserId="2" />);
		expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
	});

	it("displays 'Following' when isFollowing is true", () => {
		render(<FollowButtonClient isFollowing={true} targetUserId="2" />);
		expect(
			screen.getByRole("button", { name: "Following" }),
		).toBeInTheDocument();
	});
});
