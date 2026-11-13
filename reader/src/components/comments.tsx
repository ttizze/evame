import { useQueryState } from "nuqs";
import { lazy, type ReactNode, Suspense, useEffect } from "react";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { PageCommentForm } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-form/client";
import { CommentUpdates } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/comment-updates";
import type { PageCommentsData } from "@/app/api/_service/load-page-comments";
import { Button } from "@/components/ui/button";
import { paginationUrl, readerPageQueryState } from "./pagination-url";
import { IslandProviders } from "./providers";

const PageCommentList = lazy(async () => ({
	default: (
		await import(
			"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-list/server"
		)
	).PageCommentList,
}));

function Comments({
	locale,
	pageId,
	search,
	pathname,
	initialPage,
	initialData,
	initialList,
}: {
	locale: string;
	pageId: number;
	search: string;
	pathname: string;
	initialPage: number;
	initialData: PageCommentsData;
	initialList: ReactNode;
}) {
	const hydrated = useHydrated();
	const [page, setPage] = useQueryState(
		"page",
		readerPageQueryState.withOptions({ history: "push" }),
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
	// Readerを先に切り替える間、旧Gatewayの応答では従来どおり受付ONにする。
	const commentsEnabled =
		data?.commentsEnabled ?? initialData.commentsEnabled ?? true;
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
		<CommentUpdates value={{ refresh: updateComments, commentsEnabled }}>
			<div aria-busy={isLoading}>
				{commentsEnabled ? (
					<PageCommentForm pageId={pageId} userLocale={locale} />
				) : (
					<p className="text-sm text-muted-foreground" role="status">
						{t("closed")}
					</p>
				)}
				{!hydrated
					? initialList
					: data &&
						data.comments.length > 0 && (
							<Suspense fallback={initialList}>
								<PageCommentList comments={data.comments} userLocale={locale} />
							</Suspense>
						)}
				{data && data.totalPages > 1 && (
					<nav
						aria-label={t("pagination")}
						className="not-prose flex justify-center items-center gap-4"
					>
						{page > 1 && (
							<Button asChild size="sm" variant="outline">
								<a
									href={paginationUrl(pathname, search, page - 1, "#comments")}
									onClick={(event) => {
										event.preventDefault();
										void setPage(page - 1);
									}}
								>
									{t("previous")}
								</a>
							</Button>
						)}
						<span>{t("page", { page, total: data.totalPages })}</span>
						{page < data.totalPages && (
							<Button asChild size="sm" variant="outline">
								<a
									href={paginationUrl(pathname, search, page + 1, "#comments")}
									onClick={(event) => {
										event.preventDefault();
										void setPage(page + 1);
									}}
								>
									{t("next")}
								</a>
							</Button>
						)}
					</nav>
				)}
			</div>
		</CommentUpdates>
	);
}

export function CommentsIsland(props: Parameters<typeof Comments>[0]) {
	return (
		<IslandProviders locale={props.locale} search={props.search}>
			<Comments {...props} />
		</IslandProviders>
	);
}
