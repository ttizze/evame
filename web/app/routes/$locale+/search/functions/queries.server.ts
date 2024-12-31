import { prisma } from "~/utils/prisma";
import type { Category } from "../route";

export async function searchByCategory(query: string, category: Category, skip: number, take: number) {
  const trimmed = query.trim();
  if (!trimmed) return {
    results: [],
    totalPages: 0,
    currentPage: 0,
  };

  switch (category) {
    case "title":
      // sourceText からテキストを検索して、Page を取り出して返す
      // number: 0 のもの（タイトル用と想定）を対象にする
      const titleResults = await prisma.sourceText.findMany({
				skip,
				take,
        where: {
          text: { contains: trimmed, mode: "insensitive" },
          number: 0,
        },
        include: {
          page: {
            include: {
              user: true,
              tagPages: {
                include: { tag: true },
              },
            },
          },
        },
      });
			const titleTotalCount = await prisma.sourceText.count({
				where: {
					text: { contains: trimmed, mode: "insensitive" },
					number: 0,
				},
			});
			const titleTotalPages = Math.ceil(titleTotalCount / take);	
      return {
					results: titleResults.map((r) => r.page),
					totalPages: titleTotalPages,
					currentPage: skip / take + 1,
				};

			case "content":
				const contentResults = await prisma.page.findMany({
					skip,
					take,
					where: {
						content: {
							contains: trimmed,
							mode: "insensitive",
						},
					},
					include: {
						user: true,
						tagPages: {
							include: { tag: true },
						},
					},
				});
				const contentTotalCount = await prisma.page.count({
					where: {
						content: {
							contains: trimmed,
							mode: "insensitive",
						},
					},
				});
				const contentTotalPages = Math.ceil(contentTotalCount / take);
				return {
					results: contentResults,
					totalPages: contentTotalPages,
					currentPage: skip / take + 1,
				};


    case "tags":
      const tagResults = await prisma.tag.findMany({
        skip,
        take,
        where: {
          name: {
            contains: trimmed,
            mode: "insensitive",
          },
      }});
			const tagTotalCount = await prisma.tag.count({
				where: {
					name: {
						contains: trimmed,
						mode: "insensitive",
					},
				},
			});
			const tagTotalPages = Math.ceil(tagTotalCount / take);
			return {
				results: tagResults,
				totalPages: tagTotalPages,
				currentPage: skip / take + 1,
			};	

			case "user":
				const userResults = await prisma.user.findMany({
					skip,
					take,
					where: {
						displayName: {
							contains: trimmed,
							mode: "insensitive",
						},
					},
				});
				const userTotalCount = await prisma.user.count({
					where: {
						displayName: {
							contains: trimmed,
							mode: "insensitive",
						},
					},
				});
				const userTotalPages = Math.ceil(userTotalCount / take);
				return {
					results: userResults,
					totalPages: userTotalPages,
					currentPage: skip / take + 1,
				};
    default:
      return {
				results: [],
				totalPages: 0,
				currentPage: 0,
			};
  }
}
