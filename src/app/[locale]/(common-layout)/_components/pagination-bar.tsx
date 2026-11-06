import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationBarProps {
	totalPages: number;
	currentPage: number;
	pathname: string;
	search: string;
}

export function PaginationBar({
	totalPages,
	currentPage,
	pathname,
	search,
}: PaginationBarProps) {
	if (totalPages <= 1) {
		return null;
	}

	// 現在のpathnameとsearch paramsを保ち、pageだけを上書きする。
	const getPageUrl = (page: number) => {
		const params = new URLSearchParams(search);
		params.set("page", page.toString());
		return `${pathname}?${params.toString()}`;
	};
	return (
		<Pagination className="mt-4">
			<PaginationContent className="w-full justify-between">
				<PaginationItem>
					<PaginationPrevious
						className={
							currentPage === 1 ? "pointer-events-none opacity-50" : ""
						}
						href={getPageUrl(currentPage - 1)}
					/>
				</PaginationItem>
				<div className="flex items-center space-x-2">
					{Array.from({ length: totalPages }, (_, i) => i + 1).map(
						(pageNumber) => {
							if (
								pageNumber === 1 ||
								pageNumber === totalPages ||
								(pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
							) {
								return (
									<PaginationItem key={`page-${pageNumber}`}>
										<PaginationLink
											href={getPageUrl(pageNumber)}
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
								return <PaginationEllipsis key={`ellipsis-${pageNumber}`} />;
							}
							return null;
						},
					)}
				</div>
				<PaginationItem>
					<PaginationNext
						className={
							currentPage === totalPages ? "pointer-events-none opacity-50" : ""
						}
						href={getPageUrl(currentPage + 1)}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
