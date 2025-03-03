"use client";

import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { useRouter, useSearchParams } from "next/navigation";

interface PaginationControlsProps {
	currentPage: number;
	totalPages: number;
}

export function PaginationControls({
	currentPage,
	totalPages,
}: PaginationControlsProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const handlePageChange = (newPage: number) => {
		const params = new URLSearchParams(searchParams);
		params.set("page", newPage.toString());
		router.push(`?${params.toString()}`);
	};

	return (
		<PaginationBar
			currentPage={currentPage}
			totalPages={totalPages}
			onPageChange={handlePageChange}
		/>
	);
}
