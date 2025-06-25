import {
  fetchPageViewCounts,
  fetchPaginatedOwnPages,
} from '../../_db/queries.server';
import { PageManagementTabClient } from './client';

interface PageManagementTabProps {
  currentUserId: string;
  locale: string;
  page: number;
  query: string;
  handle: string;
}

export async function PageManagementTab({
  currentUserId,
  locale,
  page,
  query,
  handle,
}: PageManagementTabProps) {
  const { pagesWithTitle, totalPages, currentPage } =
    await fetchPaginatedOwnPages(currentUserId, locale, page, 10, query);

  const counts = await fetchPageViewCounts(pagesWithTitle.map((p) => p.id));

  const pageViewCounters = pagesWithTitle.reduce(
    (acc, pageData) => {
      acc[pageData.id] = <span>{counts[pageData.id] ?? 0}</span>;
      return acc;
    },
    {} as Record<string, React.ReactNode>
  );

  return (
    <PageManagementTabClient
      currentPage={currentPage}
      handle={handle}
      pagesWithTitle={pagesWithTitle}
      pageViewCounters={pageViewCounters}
      totalPages={totalPages}
    />
  );
}
