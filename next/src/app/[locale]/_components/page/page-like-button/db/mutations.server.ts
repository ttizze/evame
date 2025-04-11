import { prisma } from "@/lib/prisma";

interface UserIdentifier {
	type: "user";
	id: string;
}

interface GuestIdentifier {
	type: "guest";
	id: string;
}

export async function togglePageLike(
	slug: string,
	identifier: UserIdentifier | GuestIdentifier,
) {
	const page = await prisma.page.findUnique({ where: { slug } });
	if (!page) {
		throw new Error("Page not found");
	}
	const where = {
		pageId: page.id,
		...(identifier.type === "user"
			? { userId: identifier.id }
			: { guestId: identifier.id }),
	};
	const existing = await prisma.likePage.findFirst({
		where,
	});
	let liked: boolean;
	if (existing) {
		await prisma.likePage.delete({ where: { id: existing.id } });
		liked = false;
	} else {
		await prisma.likePage.create({
			data: {
				pageId: page.id,
				...(identifier.type === "user"
					? { userId: identifier.id }
					: { guestId: identifier.id }),
			},
		});
		if (identifier.type === "user") {
			await createNotificationLike(page.id, page.userId, identifier.id);
		}
		liked = true;
	}

	// 更新後の最新のいいね数を取得する
	const likeCount = await prisma.likePage.count({
		where: { pageId: page.id },
	});

	return { liked, likeCount };
}

export async function createNotificationLike(
	pageId: number,
	targetUserId: string,
	actorId: string,
) {
	await prisma.notification.create({
		data: {
			pageId: pageId,
			userId: targetUserId,
			actorId: actorId,
			type: "PAGE_LIKE",
		},
	});
}
