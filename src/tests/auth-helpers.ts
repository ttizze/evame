import { vi } from "vitest";
import type { User } from "@/drizzle/types";
import { getCurrentUser } from "@/lib/auth-server";

export type SessionUser = {
	id: string;
	name: string;
	handle: string;
	plan: string;
	profile: string;
	twitterHandle: string;
	totalPoints: number;
	isAI: boolean;
	image: string;
	createdAt: Date;
	updatedAt: Date;
	hasGeminiApiKey: boolean;
};

/**
 * DrizzleのUser型をgetCurrentUserが返す型に変換するヘルパー
 * （テスト用：実際のセッション管理は外部システムなのでモック）
 */
export function toSessionUser(user: User): SessionUser {
	return {
		id: user.id,
		name: user.name,
		handle: user.handle,
		plan: user.plan,
		profile: user.profile,
		twitterHandle: user.twitterHandle,
		totalPoints: user.totalPoints,
		isAI: user.isAI,
		image: user.image,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		hasGeminiApiKey: false,
	};
}

/**
 * getCurrentUserのモックを設定するヘルパー
 * 使用例: mockCurrentUser(user) または mockCurrentUser(null)
 */
export function mockCurrentUser(user: User | null): void {
	vi.mocked(getCurrentUser).mockResolvedValue(
		user ? toSessionUser(user) : null,
	);
}
