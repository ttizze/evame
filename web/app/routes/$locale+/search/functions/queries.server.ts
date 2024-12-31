// app/routes/search/functions/queries.server.ts

import type { Page, SourceText, Tag, TagPage, User } from "@prisma/client";
import type { SanitizedUser } from "~/types";
import { prisma } from "~/utils/prisma";
import { sanitizeUser } from "~/utils/sanitizeUser";

/** Page + リレーションを含む型 (title/content 用) */
export type PageWithRelations = Page & {
	sourceText: SourceText;
	sanitizedUser: SanitizedUser;
	tagPages: Array<TagPage & { tag: Tag }>;
};

/** タイトル検索 (sourceText.number=0) → PageWithRelations[] */
export async function searchTitle(
	query: string,
	skip: number,
	take: number,
): Promise<{
	pages: PageWithRelations[];
	totalCount: number;
}> {
	const [srcTexts, count] = await Promise.all([
		prisma.sourceText.findMany({
			skip,
			take,
			where: {
				text: { contains: query, mode: "insensitive" },
				number: 0,
			},
			include: {
				page: {
					include: {
						user: true,
						tagPages: { include: { tag: true } },
						// number=0 のソーステキストを1つだけ取りたい場合
						sourceTexts: {
							where: {
								number: 0,
							},
						},
					},
				},
			},
		}),
		prisma.sourceText.count({
			where: {
				text: { contains: query, mode: "insensitive" },
				number: 0,
			},
		}),
	]);

	const pages = srcTexts.map((st) => ({
		...st.page,
		sourceText: st,
		sanitizedUser: sanitizeUser(st.page.user),
	})) as PageWithRelations[];
	return { pages, totalCount: count };
}

/** コンテンツ検索 (Page.content) → PageWithRelations[] */
export async function searchContent(
	query: string,
	skip: number,
	take: number,
): Promise<{
	pages: PageWithRelations[];
	totalCount: number;
}> {
	const [pages, count] = await Promise.all([
		prisma.page.findMany({
			skip,
			take,
			where: {
				content: { contains: query, mode: "insensitive" },
			},
			include: {
				user: true,
				tagPages: { include: { tag: true } },
				sourceTexts: {
					where: {
						number: 0,
					},
				},
			},
		}),
		prisma.page.count({
			where: {
				content: { contains: query, mode: "insensitive" },
			},
		}),
	]);
	const pagesWithRelations = pages.map((page) => ({
		...page,
		sourceText: page.sourceTexts[0],
		sanitizedUser: sanitizeUser(page.user),
	})) as PageWithRelations[];
	return { pages: pagesWithRelations, totalCount: count };
}

/** タグ検索 (Tag.name) → Tag[] */
export async function searchTags(
	query: string,
	skip: number,
	take: number,
): Promise<{
	tags: Tag[];
	totalCount: number;
}> {
	const [tags, count] = await Promise.all([
		prisma.tag.findMany({
			skip,
			take,
			where: {
				name: { contains: query, mode: "insensitive" },
			},
		}),
		prisma.tag.count({
			where: {
				name: { contains: query, mode: "insensitive" },
			},
		}),
	]);
	return { tags, totalCount: count };
}

/** ユーザー検索 (User.displayName) → User[] */
export async function searchUsers(
	query: string,
	skip: number,
	take: number,
): Promise<{
	users: User[];
	totalCount: number;
}> {
	const [users, count] = await Promise.all([
		prisma.user.findMany({
			skip,
			take,
			where: {
				displayName: { contains: query, mode: "insensitive" },
			},
		}),
		prisma.user.count({
			where: {
				displayName: { contains: query, mode: "insensitive" },
			},
		}),
	]);
	const usersWithSanitized = users.map((user) => ({
		...user,
		sanitizedUser: sanitizeUser(user),
	})) as User[];
	return { users: usersWithSanitized, totalCount: count };
}
