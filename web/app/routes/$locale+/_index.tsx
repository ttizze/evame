import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";

import { StartButton } from "~/components/StartButton";
import { supportedLocaleOptions } from "~/constants/languages";
import i18nServer from "~/i18n.server";
import { SourceTextAndTranslationSection } from "~/routes/$locale+/user.$userName+/page+/$slug+/components/sourceTextAndTranslationSection/SourceTextAndTranslationSection";
import { fetchPageWithTranslations } from "~/routes/$locale+/user.$userName+/page+/$slug+/functions/queries.server";
import { authenticator } from "~/utils/auth.server";

import { data } from "@remix-run/node";
import { PageCard } from "~/components/PageCard";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "~/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { fetchPaginatedPagesWithInfo } from "~/routes/$locale+/functions/queries.server";
import type { PageCardLocalizedType } from "~/routes/$locale+/functions/queries.server";
import { ensureGuestId } from "~/utils/ensureGuestId.server";
import { commitSession } from "~/utils/session.server";

export const meta: MetaFunction = () => {
	return [
		{ title: "Evame - Home - Latest Pages" },
		{
			name: "description",
			content:
				"Evame is an open-source platform for collaborative article translation and sharing.",
		},
	];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request);
	let locale = params.locale;
	if (!locale || !supportedLocaleOptions.some((l) => l.code === locale)) {
		locale = (await i18nServer.getLocale(request)) || "en";
		const url = new URL(request.url);
		url.pathname = `/${locale}${url.pathname}`;
		return redirect(url.toString());
	}

	let heroTitle = null;
	let heroText = null;
	if (!currentUser) {
		const pageName = locale === "en" ? "evame-ja" : "evame";
		const topPageWithTranslations = await fetchPageWithTranslations(
			pageName,
			locale,
			undefined,
		);
		if (!topPageWithTranslations) {
			throw new Response("Not Found", { status: 404 });
		}

		const [title, text] = topPageWithTranslations.sourceTextWithTranslations
			.filter((st) => st.sourceText.number === 0 || st.sourceText.number === 1)
			.sort((a, b) => a.sourceText.number - b.sourceText.number);

		if (!title || !text) {
			throw new Response("Not Found", { status: 404 });
		}
		heroTitle = title;
		heroText = text;
	}

	// タブ状態判定
	const url = new URL(request.url);
	const tab = url.searchParams.get("tab") || "recommended";
	const newPage = Number(url.searchParams.get("newPage") || "1");
	const recommendedPage = Number(
		url.searchParams.get("recommendedPage") || "1",
	);

	// ゲストID確保
	const { session, guestId } = await ensureGuestId(request);

	// ページング情報取得
	let pagesWithInfo: PageCardLocalizedType[];
	let totalPages: number;
	let currentPage: number;

	if (tab === "recommended") {
		const result = await fetchPaginatedPagesWithInfo({
			page: recommendedPage,
			pageSize: 9,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			isRecommended: true,
			locale,
		});
		pagesWithInfo = result.pagesWithInfo;
		totalPages = result.totalPages;
		currentPage = result.currentPage;
	} else {
		const result = await fetchPaginatedPagesWithInfo({
			page: newPage,
			pageSize: 9,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			locale,
		});
		pagesWithInfo = result.pagesWithInfo;
		totalPages = result.totalPages;
		currentPage = result.currentPage;
	}

	// セッションをクッキーに反映
	const headers = new Headers();
	headers.set("Set-Cookie", await commitSession(session));

	return data(
		{
			currentUser,
			heroTitle,
			heroText,
			tab,
			pagesWithInfo,
			totalPages,
			currentPage,
		},
		{
			headers,
		},
	);
}

export default function Home() {
	const {
		currentUser,
		heroTitle,
		heroText,
		tab,
		pagesWithInfo,
		totalPages,
		currentPage,
	} = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();

	// タブ切り替え
	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set("tab", value);
		setSearchParams(params);
	};

	// ページング切り替え
	const handlePageChange = (pageNumber: number) => {
		const params = new URLSearchParams(searchParams);
		if (tab === "recommended") {
			params.set("recommendedPage", pageNumber.toString());
		} else {
			params.set("newPage", pageNumber.toString());
		}
		setSearchParams(params);
	};

	return (
		<div className="flex flex-col justify-between">
			{/* 未ログインの場合のみ hero を表示 */}
			{!currentUser && heroTitle && heroText && (
				<main className="prose dark:prose-invert sm:prose lg:prose-lg mx-auto px-2 py-10 flex flex-col items-center justify-center">
					<div className="max-w-4xl w-full">
						<h1 className="text-7xl font-bold mb-20 text-center">
							<SourceTextAndTranslationSection
								sourceTextWithTranslations={heroTitle}
								sourceTextClassName="w-full bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text !text-transparent mb-2"
								elements={heroTitle.sourceText.text}
								currentUserName={undefined}
								showOriginal={true}
								showTranslation={true}
							/>
						</h1>

						<span className="text-xl mb-12 w-full">
							<SourceTextAndTranslationSection
								sourceTextWithTranslations={heroText}
								sourceTextClassName="mb-2"
								elements={heroText.sourceText.text}
								showOriginal={true}
								showTranslation={true}
								currentUserName={undefined}
							/>
						</span>
						<div className="mb-12 flex justify-center mt-10">
							<StartButton className="w-60 h-12 text-xl" />
						</div>
					</div>
				</main>
			)}

			{/* ページ一覧 */}
			<div className="container mx-auto px-4">
				<Tabs value={tab} onValueChange={handleTabChange}>
					<TabsList className="flex justify-center rounded-full mb-4">
						<TabsTrigger value="recommended" className="rounded-full w-1/2">
							Hot🔥
						</TabsTrigger>
						<TabsTrigger value="new" className="rounded-full w-1/2">
							New✨️
						</TabsTrigger>
					</TabsList>

					{/* --- おすすめページタブ --- */}
					<TabsContent value="recommended">
						<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
							{pagesWithInfo.map((page) => (
								<PageCard
									key={page.id}
									pageCard={page}
									pageLink={`/user/${page.user.userName}/page/${page.slug}`}
									userLink={`/user/${page.user.userName}`}
								/>
							))}
						</div>
						{/* ページネーション */}
						<div className="mt-8 flex justify-center">
							<Pagination className="mt-4">
								<PaginationContent className="w-full justify-between">
									<PaginationItem>
										<PaginationPrevious
											onClick={() => handlePageChange(currentPage - 1)}
											className={
												currentPage === 1
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>
									<div className="flex items-center space-x-2">
										{Array.from({ length: totalPages }, (_, i) => i + 1).map(
											(pageNumber) => {
												if (
													pageNumber === 1 ||
													pageNumber === totalPages ||
													(pageNumber >= currentPage - 1 &&
														pageNumber <= currentPage + 1)
												) {
													return (
														<PaginationItem key={`page-${pageNumber}`}>
															<PaginationLink
																onClick={() => handlePageChange(pageNumber)}
																isActive={currentPage === pageNumber}
															>
																{pageNumber}
															</PaginationLink>
														</PaginationItem>
													);
												}
												if (
													pageNumber === currentPage - 2 ||
													pageNumber === currentPage + 2
												) {
													return (
														<PaginationEllipsis
															key={`ellipsis-${pageNumber}`}
														/>
													);
												}
												return null;
											},
										)}
									</div>
									<PaginationItem>
										<PaginationNext
											onClick={() => handlePageChange(currentPage + 1)}
											className={
												currentPage === totalPages
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					</TabsContent>

					{/* --- 新着ページタブ --- */}
					<TabsContent value="new">
						<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
							{pagesWithInfo.map((page) => (
								<PageCard
									key={page.id}
									pageCard={page}
									pageLink={`/user/${page.user.userName}/page/${page.slug}`}
									userLink={`/user/${page.user.userName}`}
								/>
							))}
						</div>
						{/* ページネーション */}
						<div className="mt-8 flex justify-center">
							<Pagination className="mt-4">
								<PaginationContent className="w-full justify-between">
									<PaginationItem>
										<PaginationPrevious
											onClick={() => handlePageChange(currentPage - 1)}
											className={
												currentPage === 1
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>
									<div className="flex items-center space-x-2">
										{Array.from({ length: totalPages }, (_, i) => i + 1).map(
											(pageNumber) => {
												if (
													pageNumber === 1 ||
													pageNumber === totalPages ||
													(pageNumber >= currentPage - 1 &&
														pageNumber <= currentPage + 1)
												) {
													return (
														<PaginationItem key={`page-${pageNumber}`}>
															<PaginationLink
																onClick={() => handlePageChange(pageNumber)}
																isActive={currentPage === pageNumber}
															>
																{pageNumber}
															</PaginationLink>
														</PaginationItem>
													);
												}
												if (
													pageNumber === currentPage - 2 ||
													pageNumber === currentPage + 2
												) {
													return (
														<PaginationEllipsis
															key={`ellipsis-${pageNumber}`}
														/>
													);
												}
												return null;
											},
										)}
									</div>
									<PaginationItem>
										<PaginationNext
											onClick={() => handlePageChange(currentPage + 1)}
											className={
												currentPage === totalPages
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
