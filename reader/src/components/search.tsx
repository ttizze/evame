import { Edit3, FileText, Hash, User } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { fromJSON } from "seroval";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { PageLikeButtonClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/client";
import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import { CATEGORIES } from "@/app/[locale]/(common-layout)/search/constants";
import type { loadReaderData } from "@/app/api/reader-data/_service/load-reader-data";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { readerPageQueryState } from "./pagination-url";
import { IslandProviders } from "./providers";

function Search({
	initialResult,
	search,
}: {
	initialResult: Extract<
		NonNullable<Awaited<ReturnType<typeof loadReaderData>>>,
		{ kind: "search" }
	>;
	search: string;
}) {
	const { locale } = initialResult;
	const hydrated = useHydrated();
	const [state, setState] = useQueryStates({
		query: parseAsString.withDefault(""),
		category: parseAsStringLiteral(CATEGORIES).withDefault("title"),
		page: readerPageQueryState,
	});
	const params = new URLSearchParams(search);
	params.set("query", state.query);
	params.set("category", state.category);
	params.set("page", String(state.page));
	const currentSearch = `?${params}`;
	const { data: result, isLoading } = useSWR(
		["reader-search", locale, currentSearch],
		async () => {
			const response = await fetch(
				`/api/reader-data?${new URLSearchParams({ path: `/${locale}/search`, search: currentSearch })}`,
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = fromJSON(await response.json()) as {
				page: typeof initialResult;
			};
			return data.page;
		},
		{
			fallbackData:
				state.query === initialResult.query &&
				state.category === initialResult.category &&
				state.page === initialResult.page
					? initialResult
					: undefined,
			keepPreviousData: true,
		},
	);
	const t = useTranslations("Reader");
	const data = result?.data;
	const icons = { title: FileText, user: User, tags: Hash, content: Edit3 };
	const noResults =
		state.category === "user"
			? !data?.users?.length
			: state.category === "tags"
				? !data?.tags?.length && !data?.pageSummaries?.length
				: !data?.pageSummaries?.length;
	return (
		<>
			<div>
				<form
					action={`/${locale}/search`}
					className="mb-6"
					onSubmit={(event) => event.preventDefault()}
				>
					<input name="category" type="hidden" value={state.category} />
					{initialResult.tagPage === "true" && (
						<input name="tagPage" type="hidden" value="true" />
					)}
					<div className="relative">
						<Input
							aria-label={t("search")}
							className="w-full px-4 py-3 rounded-full border"
							name="query"
							onChange={(event) =>
								void setState({ query: event.target.value, page: 1 })
							}
							placeholder={t("searchPlaceholder")}
							required
							type="search"
							value={state.query}
						/>
					</div>
				</form>
				<Tabs
					onValueChange={(value) => {
						if (CATEGORIES.includes(value as typeof state.category))
							void setState({
								category: value as typeof state.category,
								page: 1,
							});
					}}
					value={state.category}
				>
					<TabsList className="mb-6 border-b w-full flex rounded-full">
						{CATEGORIES.map((category) => {
							const Icon = icons[category];
							const categoryParams = new URLSearchParams(params);
							categoryParams.set("category", category);
							categoryParams.set("page", "1");
							return (
								<TabsTrigger
									asChild
									className="flex-1 items-center justify-center rounded-full text-sm"
									key={category}
									value={category}
								>
									<a
										href={`/${locale}/search?${categoryParams}`}
										onClick={(event) => event.preventDefault()}
										tabIndex={!hydrated || state.category === category ? 0 : -1}
									>
										<Icon className="mr-1 h-4 w-4" />
										{t(category)}
									</a>
								</TabsTrigger>
							);
						})}
					</TabsList>
					{CATEGORIES.map((category) => (
						<TabsContent key={category} value={category} />
					))}
				</Tabs>
				{isLoading && <p className="text-gray-400">{t("loading")}</p>}
			</div>
			<div>
				<div className="space-y-4">
					{noResults && !isLoading && (
						<p className="text-gray-500">{t("noResults")}</p>
					)}
					{data?.tags && data.tags.length > 0 && (
						<PageTagList locale={locale} tag={data.tags} />
					)}
					{data?.pageSummaries && (
						<>
							<PageLikeListClient
								pageIds={data.pageSummaries.map((page) => page.id)}
							/>
							<div className="space-y-4">
								{data.pageSummaries.map((page) => (
									<PageList
										avatar={
											<UserAvatar
												className="w-5 h-5 shrink-0"
												image={page.userImage}
												name={page.userHandle}
											/>
										}
										index={null}
										key={page.id}
										likeButton={
											<PageLikeButtonClient
												initialLikeCount={page.likeCount}
												pageId={page.id}
												showCount={false}
											/>
										}
										locale={locale}
										ownerActions={null}
										PageForList={page}
									/>
								))}
							</div>
						</>
					)}
					{data?.users && (
						<div className="space-y-4">
							{data.users.map((user) => (
								<div
									className="flex items-start p-4 rounded-lg"
									key={user.handle}
								>
									<div className="flex-1">
										<a href={`/${locale}/${user.handle}`}>
											<h3 className="text-xl font-bold">{user.name}</h3>
											<span className="text-gray-500 text-sm">
												@{user.handle}
											</span>
										</a>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
				{data && data.totalPages > 1 && (
					<div className="mt-4 flex items-center gap-4">
						<PaginationBar
							currentPage={state.page}
							pathname={`/${locale}/search`}
							search={currentSearch}
							totalPages={data.totalPages}
						/>
					</div>
				)}
			</div>
		</>
	);
}

export function SearchIsland(props: Parameters<typeof Search>[0]) {
	return (
		<IslandProviders locale={props.initialResult.locale} search={props.search}>
			<Search {...props} />
		</IslandProviders>
	);
}
