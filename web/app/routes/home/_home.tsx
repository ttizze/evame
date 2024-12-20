import type { LoaderFunctionArgs } from "@remix-run/node";
import { data } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/react";
import { CalendarPlus } from "lucide-react";
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
import i18nServer from "~/i18n.server";
import { authenticator } from "~/utils/auth.server";
import { fetchPaginatedPublicPages } from "./functions/queries.server";
export const meta: MetaFunction = () => {
	return [{ title: "Home - Latest Pages" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const locale = await i18nServer.getLocale(request);
	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page") || "1");
	const currentUser = await authenticator.isAuthenticated(request);
	const { pagesWithInfo, totalPages, currentPage } =
		await fetchPaginatedPublicPages(page, 9, currentUser?.id);
	const pagesLocale = pagesWithInfo.map((page) => {
		return {
			...page,
			createdAt: new Date(page.createdAt).toLocaleDateString(locale),
		};
	});

	return data({ pages: pagesLocale, totalPages, currentPage, currentUser });
}

export default function Home() {
	const { pages, totalPages, currentPage } = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();

	const handlePageChange = (newPage: number) => {
		setSearchParams({ page: newPage.toString() });
	};

	return (
		<div className="container mx-auto px-4">
			<h1 className="text-xl font-bold mb-6 flex items-center gap-2">
				<CalendarPlus />
				New
			</h1>
			<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{pages.map((page) => (
					<PageCard
						key={page.id}
						pageCard={page}
						pageLink={`/${page.user.userName}/page/${page.slug}`}
						userLink={`/${page.user.userName}`}
					/>
				))}
			</div>
			<div className="mt-8 flex justify-center">
				<Pagination className="mt-4">
					<PaginationContent className="w-full justify-between">
						<PaginationItem>
							<PaginationPrevious
								onClick={() => handlePageChange(currentPage - 1)}
								className={`${
									currentPage === 1 ? "pointer-events-none opacity-50" : ""
								}`}
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
		</div>
	);
}
