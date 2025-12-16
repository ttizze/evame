import { vi } from "vitest";
import type { Users } from "@/db/types";
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
 * KyselyのUsers型をgetCurrentUserが返す型に変換するヘルパー
 * （テスト用：実際のセッション管理は外部システムなのでモック）
 */
export function toSessionUser(user: Users): SessionUser {
	return {
		id: user.id,
		name: user.name,
		handle: user.handle,
		plan: user.plan,
		profile: user.profile,
		twitterHandle: user.twitterHandle,
		totalPoints: user.totalPoints,
		isAI: user.isAi,
		image: user.image,
		createdAt: user.createdAt as Date,
		updatedAt: user.updatedAt as Date,
		hasGeminiApiKey: false,
	};
}

/**
 * getCurrentUserのモックを設定するヘルパー
 * 使用例: mockCurrentUser(user) または mockCurrentUser(null)
 */
export function mockCurrentUser(user: Users | null): void {
	vi.mocked(getCurrentUser).mockResolvedValue(
		user ? toSessionUser(user) : null,
	);
}
