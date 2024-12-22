import { prisma } from "~/utils/prisma";
import { sanitizeUser } from "~/utils/sanitizeUser";

export async function fetchSanitizedUserWithPages(
	userName: string,
	page = 1,
	pageSize = 9,
) {
	const skip = (page - 1) * pageSize;
	const userID = await prisma.user.findUnique({
		where: { userName },
		select: { id: true },
	});
	const [user, totalCount] = await Promise.all([
		prisma.user.findUnique({
			where: { userName },
			include: {
				pages: {
					select: {
						id: true,
						slug: true,
						isPublished: true,
						createdAt: true,
						likePages: {
							where: {
								userId: userID?.id,
							},
							select: {
								userId: true,
							},
						},
						_count: {
							select: {
								likePages: true,
							},
						},
						sourceTexts: {
							where: {
								number: 0,
							},
						},
					},
					where: {
						isArchived: false,
						isPublished: true,
					},
					orderBy: { createdAt: "desc" },
					skip,
					take: pageSize,
				},
			},
		}),
		prisma.page.count({
			where: {
				user: { userName },
				isArchived: false,
				isPublished: true,
			},
		}),
	]);

	if (!user) return null;

	const pages = user.pages.map((page) => ({
		...page,
		title: page.sourceTexts.filter((item) => item.number === 0)[0]?.text,
		user: {
			userName: user.userName,
			displayName: user.displayName,
			icon: user.icon,
		},
	}));

	const sanitizedUser = sanitizeUser(user);
	return {
		...sanitizedUser,
		pages,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
	};
}

export async function fetchPageById(pageId: number) {
	return prisma.page.findUnique({
		where: { id: pageId },
	});
}
