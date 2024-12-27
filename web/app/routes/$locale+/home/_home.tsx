import type { LoaderFunctionArgs } from "@remix-run/node";
import { data } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/react";
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
import { authenticator } from "~/utils/auth.server";
import { fetchPaginatedPagesWithInfo } from "../functions/queries.server";
import type { PageCardLocalizedType } from "../functions/queries.server";

export const meta: MetaFunction = () => {
	return [{ title: "Home - Latest Pages" }];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	const locale = params.locale;
	if (!locale) {
		throw new Response("Missing locale", { status: 400 });
	}
	const url = new URL(request.url);

	// タブ状態 ( new / recommended )
	const tab = url.searchParams.get("tab") || "recommended";

	// newPage / recommendedPage それぞれ別々に管理
	const newPage = Number(url.searchParams.get("newPage") || "1");
	const recommendedPage = Number(
		url.searchParams.get("recommendedPage") || "1",
	);

	// ログインユーザー
	const currentUser = await authenticator.isAuthenticated(request);

	let pagesWithInfo: PageCardLocalizedType[];
	let totalPages: number;
	let currentPage: number;

	if (tab === "recommended") {
		// いいね数が多い順でページを取得
		const result = await fetchPaginatedPagesWithInfo({
			page: recommendedPage,
			pageSize: 9,
			currentUserId: currentUser?.id,
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
			locale,
		});
		pagesWithInfo = result.pagesWithInfo;
		totalPages = result.totalPages;
		currentPage = result.currentPage;
	}

	return data({
		tab,
		pagesWithInfo,
		totalPages,
		currentPage,
	});
}

export default function Home() {
	const { tab, pagesWithInfo, totalPages, currentPage } =
		useLoaderData<typeof loader>();

	const [searchParams, setSearchParams] = useSearchParams();

	const handleTabChange = (value: string) => {
		// 現在の newPage / recommendedPage を保持
		const params = new URLSearchParams(searchParams);
		params.set("tab", value);
		// タブを切り替えても、別タブ側のページ番号はリセットされない
		setSearchParams(params);
	};

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
											currentPage === 1 ? "pointer-events-none opacity-50" : ""
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
													<PaginationEllipsis key={`ellipsis-${pageNumber}`} />
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
				{/* --- 新規ページタブ --- */}
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
											currentPage === 1 ? "pointer-events-none opacity-50" : ""
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
													<PaginationEllipsis key={`ellipsis-${pageNumber}`} />
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
	);
}
