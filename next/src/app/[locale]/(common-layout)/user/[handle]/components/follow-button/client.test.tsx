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
		render(<FollowButtonClient targetUserId="2" isFollowing={false} />);
		expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
	});

	it("displays 'Following' when isFollowing is true", () => {
		render(<FollowButtonClient targetUserId="2" isFollowing={true} />);
		expect(
			screen.getByRole("button", { name: "Following" }),
		).toBeInTheDocument();
	});
});
