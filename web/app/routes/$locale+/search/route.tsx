import { parseWithZod } from "@conform-to/zod";
import type { Tag } from "@prisma/client";
import type { User } from "@prisma/client";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import { Edit3, FileText, HashIcon, UserIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { LocaleLink } from "~/components/LocaleLink";
import { PageCard } from "~/components/PageCard";
import { PaginationBar } from "~/components/PaginationBar";
import { TagList } from "~/components/TagList";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { supportedLocaleOptions } from "~/constants/languages";
import i18nServer from "~/i18n.server";
import { authenticator } from "~/utils/auth.server";
import {
	searchByTag,
	searchContent,
	searchTags,
	searchTitle,
	searchUsers,
} from "./functions/queries.server";
export const CATEGORIES = ["title", "user", "tags", "content"] as const;
export type Category = (typeof CATEGORIES)[number];

// Zod スキーマ
const schema = z.object({
	query: z.string().min(1, "Search query is required"),
	category: z.enum(CATEGORIES),
	tagpage: z.string().optional(),
});

const PAGE_SIZE = 10;

export const meta: MetaFunction = () => [
	{ title: "Search" },
	{ name: "robots", content: "noindex" },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request);
	const url = new URL(request.url);
	const formData = Object.fromEntries(url.searchParams.entries());
	const page = Number.parseInt(formData.page || "1", 10);

	// バリデーション
	const submission = parseWithZod(new URLSearchParams(formData), { schema });
	if (submission.status !== "success") {
		// バリデ失敗 => 空結果
		return {
			currentUser,
			query: "",
			category: "title" as Category,
			page,
			totalCount: 0,
			totalPages: 0,
			pages: [],
			tags: [],
			users: [],
		};
	}

	const { query, category } = submission.value;
	const skip = (page - 1) * PAGE_SIZE;
	const take = PAGE_SIZE;
	let locale = params.locale;
	if (!locale || !supportedLocaleOptions.some((l) => l.code === locale)) {
		locale = (await i18nServer.getLocale(request)) || "en";
		const url = new URL(request.url);
		url.pathname = `/${locale}${url.pathname}`;
		return redirect(url.toString());
	}
	// カテゴリ別に検索
	let pages = undefined;
	let tags: Tag[] | undefined = undefined;
	let users: User[] | undefined = undefined;
	let totalCount = 0;

	switch (category) {
		case "title": {
			const { pages: resultPages, totalCount: cnt } = await searchTitle(
				query,
				skip,
				take,
				locale,
			);
			pages = resultPages;
			totalCount = cnt;
			break;
		}
		case "content": {
			const { pages: resultPages, totalCount: cnt } = await searchContent(
				query,
				skip,
				take,
				locale,
			);
			pages = resultPages;
			totalCount = cnt;
			break;
		}
		case "tags": {
			if (formData.tagpage === "true") {
				const { pages: resultPages, totalCount: cnt } = await searchByTag(
					query,
					skip,
					take,
					locale,
				);
				pages = resultPages;
				totalCount = cnt;
			} else {
				const { tags: resultTags, totalCount: cnt } = await searchTags(
					query,
					skip,
					take,
				);
				tags = resultTags;
				totalCount = cnt;
			}
			break;
		}
		case "user": {
			const { users: resultUsers, totalCount: cnt } = await searchUsers(
				query,
				skip,
				take,
			);
			users = resultUsers;
			totalCount = cnt;
			break;
		}
	}

	// 総ページ数
	const totalPages = Math.ceil(totalCount / take);

	return data(
		{
			query,
			category,
			page,
			pages,
			tags,
			users,
			totalCount,
			totalPages,
		},
		{
			headers: {
				"Cache-Control": "max-age=300, s-maxage=3600",
			},
		},
	);
}

export default function SearchPage() {
	const { query, page, totalPages, pages, tags, users, category } =
		useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();
	const [currentCategory, setCurrentCategory] = useState<Category>(category);

	// アイコン切り替え
	function renderIcon(cat: Category) {
		switch (cat) {
			case "title":
				return <FileText className="mr-1 h-4 w-4" />;
			case "user":
				return <UserIcon className="mr-1 h-4 w-4" />;
			case "tags":
				return <HashIcon className="mr-1 h-4 w-4" />;
			case "content":
				return <Edit3 className="mr-1 h-4 w-4" />;
			default:
				return null;
		}
	}

	// ページ変更
	function handlePageChange(newPage: number) {
		setSearchParams({
			query: query,
			category: currentCategory,
			page: String(newPage),
		});
	}

	return (
		<div className="container mx-auto p-4">
			{/* 検索フォーム */}
			<Form method="get" className="mb-6">
				<input type="hidden" name="category" value={currentCategory} />
				<div className="relative">
					<Input
						type="search"
						name="query"
						defaultValue={query}
						placeholder="Search..."
						className="w-full px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</Form>

			{/* タブ */}
			<Tabs
				value={currentCategory}
				onValueChange={(val) => {
					setCurrentCategory(val as Category);
					setSearchParams({
						query: searchParams.get("query") ?? "",
						category: val,
					});
				}}
			>
				<TabsList className="mb-6 border-b w-full flex rounded-full">
					{CATEGORIES.map((cat) => (
						<TabsTrigger
							key={cat}
							value={cat}
							className="flex-1 items-center justify-center rounded-full text-sm"
						>
							{renderIcon(cat)}
							{cat.charAt(0).toUpperCase() + cat.slice(1)}
						</TabsTrigger>
					))}
				</TabsList>
				{CATEGORIES.map((cat) => (
					<TabsContent key={cat} value={cat} />
				))}
			</Tabs>

			{/* 検索結果 */}
			<div className="space-y-4">
				{/* カテゴリごとに表示する配列が違う */}
				{currentCategory === "tags" && tags?.length === 0 && (
					<p className="text-gray-500">No results found.</p>
				)}
				{currentCategory === "user" && users?.length === 0 && (
					<p className="text-gray-500">No results found.</p>
				)}
				{(currentCategory === "title" || currentCategory === "content") &&
					pages?.length === 0 && (
						<p className="text-gray-500">No results found.</p>
					)}

				{/* タグの表示 */}
				{currentCategory === "tags" && tags && tags.length > 0 && (
					<div className="space-y-4">
						<TagList tag={tags} />
					</div>
				)}
				{currentCategory === "tags" && pages && pages.length > 0 && (
					<div className="space-y-4">
						{pages.map((pageItem) => (
							<PageCard
								key={pageItem.id}
								pageCard={pageItem}
								pageLink={`/user/${pageItem.user.userName}/page/${pageItem.slug}`}
								userLink={`/user/${pageItem.user.userName}`}
							/>
						))}
					</div>
				)}

				{/* ユーザーの表示 */}
				{currentCategory === "user" && users && users.length > 0 && (
					<div className="space-y-4">
						{users.map((usr: User) => (
							<div
								key={usr.id}
								className="flex items-start p-4  rounded-lg transition"
							>
								<div className="flex-1">
									<LocaleLink to={`/user/${usr.userName}`}>
										<h3 className="text-xl font-bold">{usr.displayName}</h3>
										<span className="text-gray-500 text-sm">
											@{usr.userName}
										</span>
									</LocaleLink>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Page (title/content) の表示 */}
				{(currentCategory === "title" || currentCategory === "content") &&
					pages &&
					pages.length > 0 && (
						<div className="space-y-4">
							{pages.map((pageItem) => (
								<PageCard
									key={pageItem.id}
									pageCard={pageItem}
									pageLink={`/user/${pageItem.user.userName}/page/${pageItem.slug}`}
									userLink={`/user/${pageItem.user.userName}`}
								/>
							))}
						</div>
					)}
			</div>

			{/* ページャー */}
			<div className="mt-4 flex items-center gap-4">
				<PaginationBar
					totalPages={totalPages}
					currentPage={page}
					onPageChange={handlePageChange}
				/>
			</div>
		</div>
	);
}
