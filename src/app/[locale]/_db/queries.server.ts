import { db } from "@/db";

/**
 * ページIDでページとユーザー情報を取得
 * Kyselyに移行済み
 *
 * 返却構造: ページオブジェクトにuserをネストして返す
 * これにより、page.user.nameのようにアクセスでき、ドメインモデルとの整合性が保たれる
 */
export async function getPageById(pageId: number) {
	const result = await db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.select([
			"pages.id",
			"pages.slug",
			"pages.createdAt",
			"pages.updatedAt",
			"pages.status",
			"pages.sourceLocale",
			"pages.parentId",
			"pages.order",
			"users.id as userId",
			"users.name as userName",
			"users.handle as userHandle",
			"users.image as userImage",
			"users.createdAt as userCreatedAt",
			"users.updatedAt as userUpdatedAt",
			"users.profile as userProfile",
			"users.twitterHandle as userTwitterHandle",
			"users.totalPoints as userTotalPoints",
			"users.isAi as userIsAI",
			"users.plan as userPlan",
		])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	if (!result) return null;

	// ドメインモデルに合わせて、userをページオブジェクト内にネストして返す
	return {
		id: result.id,
		slug: result.slug,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
		status: result.status,
		sourceLocale: result.sourceLocale,
		parentId: result.parentId,
		order: result.order,
		user: {
			id: result.userId,
			name: result.userName,
			handle: result.userHandle,
			image: result.userImage,
			createdAt: result.userCreatedAt,
			updatedAt: result.userUpdatedAt,
			profile: result.userProfile,
			twitterHandle: result.userTwitterHandle,
			totalPoints: result.userTotalPoints,
			isAI: result.userIsAI,
			plan: result.userPlan,
		},
	};
}
