"use client";
import { usePathname, useSearchParams } from "next/navigation";
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
}

export function PaginationBar({ totalPages, currentPage }: PaginationBarProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	if (totalPages <= 1) {
		return null;
	}

	const currentParams = Object.fromEntries(searchParams.entries());

	// 現在の URL の pathname と既存の searchParams をベースに、
	// page パラメータだけを上書きするリンク用 URL オブジェクトを生成
	const getPageUrl = (page: number) => ({
		pathname,
		query: { ...currentParams, page: page.toString() },
	});
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
