import { prisma } from "~/utils/prisma";

export async function searchTitle(query: string) {
	const pages = await prisma.page.findMany({
		where: {
			AND: [
				{
					isPublished: true,
					isArchived: false,
				},
				{
					OR: [
						{
							sourceTexts: {
								some: {
									text: { contains: query, mode: "insensitive" },
								},
							},
						},
						{
							sourceTexts: {
								some: {
									translateTexts: {
										some: {
											text: { contains: query, mode: "insensitive" },
										},
									},
								},
							},
						},
					],
				},
			],
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			slug: true,
			user: {
				select: { userName: true },
			},
			sourceTexts: {
				where: {
					number: 0,
				},
				select: {
					id: true,
					text: true,
					number: true,
					translateTexts: {
						select: { id: true, text: true },
					},
				},
			},
		},
	});
	const pagesWithTitle = pages.map((page) => {
		return {
			...page,
			title: page.sourceTexts.filter((item) => item.number === 0)[0].text,
		};
	});
	return pagesWithTitle;
}
