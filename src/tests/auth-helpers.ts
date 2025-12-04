import type { User } from "@prisma/client";

/**
 * PrismaのUser型をgetCurrentUserが返す型に変換するヘルパー
 * （テスト用：実際のセッション管理は外部システムなのでモック）
 */
export function toSessionUser(user: User): {
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
} {
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
		hasGeminiApiKey: false, // テストではデフォルトでfalse
	};
}
