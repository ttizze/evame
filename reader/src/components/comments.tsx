import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect } from "react";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import { PageCommentForm } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-form/client";
import { PageCommentList } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-list/server";
import { CommentUpdates } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/comment-updates";
import type { PageCommentsData } from "@/app/api/_service/load-page-comments";
import { paginationUrl } from "./pagination-url";
import { IslandProviders } from "./providers";

function Comments({
	locale,
	pageId,
	search,
	pathname,
	initialPage,
	initialData,
}: {
	locale: string;
	pageId: number;
	search: string;
	pathname: string;
	initialPage: number;
	initialData: PageCommentsData;
}) {
	const [page, setPage] = useQueryState(
		"page",
		parseAsInteger.withDefault(initialPage).withOptions({ history: "push" }),
	);
	const { data, mutate, isLoading } = useSWR(
		["reader-comments", pageId, locale, page],
		async () => {
			const response = await fetch(
				`/api/reader-comments?${new URLSearchParams({ pageId: String(pageId), locale, page: String(page) })}`,
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return response.json() as Promise<PageCommentsData>;
		},
		{ fallbackData: page === initialPage ? initialData : undefined },
	);
	const t = useTranslations("Comments");
	const count = data?.count;
	useEffect(() => {
		if (count !== undefined)
			for (const node of document.querySelectorAll(
				`[data-comment-count="${pageId}"]`,
			))
				node.textContent = String(count);
	}, [count, pageId]);
	const updateComments = async (newPage: number | null) => {
		if (newPage !== null && newPage !== page) await setPage(newPage);
		else await mutate();
	};
	return (
		<CommentUpdates value={updateComments}>
			<div aria-busy={isLoading}>
				<PageCommentForm pageId={pageId} userLocale={locale} />
				<PageCommentList comments={data?.comments ?? []} userLocale={locale} />
				{data && data.totalPages > 1 && (
					<nav
						aria-label={t("pagination")}
						className="not-prose flex justify-center items-center gap-4"
					>
						{page > 1 && (
							<a
								href={paginationUrl(pathname, search, page - 1, "#comments")}
								onClick={(event) => {
									event.preventDefault();
									void setPage(page - 1);
								}}
							>
								{t("previous")}
							</a>
						)}
						<span>{t("page", { page, total: data.totalPages })}</span>
						{page < data.totalPages && (
							<a
								href={paginationUrl(pathname, search, page + 1, "#comments")}
								onClick={(event) => {
									event.preventDefault();
									void setPage(page + 1);
								}}
							>
								{t("next")}
							</a>
						)}
					</nav>
				)}
			</div>
		</CommentUpdates>
	);
}

export function CommentsIsland(props: Parameters<typeof Comments>[0]) {
	return (
		<IslandProviders locale={props.locale}>
			<Comments {...props} />
		</IslandProviders>
	);
}
