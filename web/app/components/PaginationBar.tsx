// app/components/PaginationBar.tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "~/components/ui/pagination";
interface PaginationBarProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({
  totalPages,
  currentPage,
  onPageChange,
}: PaginationBarProps) {
  if (totalPages <= 1) {
    return null; // 総ページ数が1以下ならページング不要
  }

  return (
    <Pagination className="mt-4">
    <PaginationContent className="w-full justify-between">
      <PaginationItem>
        <PaginationPrevious
          onClick={() => onPageChange(currentPage - 1)}
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
                    onClick={() => onPageChange(pageNumber)}
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
          onClick={() => onPageChange(currentPage + 1)}
          className={
            currentPage === totalPages
              ? "pointer-events-none opacity-50"
              : ""
          }
        />
      </PaginationItem>
    </PaginationContent>
  </Pagination>
  );
}
