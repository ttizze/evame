import { prisma } from "@/lib/prisma";

export async function togglePageLike(pageId: number, currentUserId: string) {
	const page = await prisma.page.findUnique({ where: { id: pageId } });
	if (!page) {
		throw new Error("Page not found");
	}
	const existing = await prisma.likePage.findFirst({
		where: {
			pageId: page.id,
			userId: currentUserId,
		},
	});
	let liked: boolean;
	if (existing) {
		await prisma.likePage.delete({ where: { id: existing.id } });
		liked = false;
	} else {
		await prisma.likePage.create({
			data: {
				pageId: page.id,
				userId: currentUserId,
			},
		});
		await createPageLikeNotification({
			pageId: page.id,
			targetUserId: page.userId,
			actorId: currentUserId,
		});
		liked = true;
	}

	// 更新後の最新のいいね数を取得する
	const likeCount = await prisma.likePage.count({
		where: { pageId: page.id },
	});

	return { liked, likeCount };
}

export async function createPageLikeNotification({
	pageId,
	targetUserId,
	actorId,
}: {
	pageId: number;
	targetUserId: string;
	actorId: string;
}) {
	await prisma.notification.create({
		data: {
			pageId,
			userId: targetUserId,
			actorId,
			type: "PAGE_LIKE",
		},
	});
}
