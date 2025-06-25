import type { Tag } from '@prisma/client';
import { PageList } from '@/app/[locale]/_components/page/page-list.server';
import { PageTagList } from '@/app/[locale]/_components/page/page-tag-list';
import { PaginationBar } from '@/app/[locale]/_components/pagination-bar';
import type { PageSummary } from '@/app/[locale]/types';
import type { SanitizedUser } from '@/app/types';
import type { Category } from './constants';

interface SearchResultsProps {
  pageSummaries: PageSummary[] | undefined;
  tags: Tag[] | undefined;
  users: SanitizedUser[] | undefined;
  totalPages: number;
  currentCategory: Category;
  currentPage: number;
  locale: string;
}

export function SearchResults({
  pageSummaries,
  tags,
  users,
  totalPages,
  currentCategory,
  currentPage,
  locale,
}: SearchResultsProps) {
  return (
    <div>
      <div className="space-y-4">
        {(currentCategory === 'title' || currentCategory === 'content') &&
          pageSummaries?.length === 0 && (
            <p className="text-gray-500">No results found.</p>
          )}
        {currentCategory === 'tags' && tags?.length === 0 && (
          <p className="text-gray-500">No results found.</p>
        )}
        {currentCategory === 'user' && users?.length === 0 && (
          <p className="text-gray-500">No results found.</p>
        )}

        {currentCategory === 'tags' && tags?.length && tags.length > 0 && (
          <PageTagList tag={tags} />
        )}
        {currentCategory === 'tags' &&
          pageSummaries?.length &&
          pageSummaries.length > 0 && (
            <div className="space-y-4">
              {pageSummaries.map((p) => (
                <PageList key={p.id} locale={locale} pageSummary={p} />
              ))}
            </div>
          )}

        {currentCategory === 'user' && users?.length && users.length > 0 && (
          <div className="space-y-4">
            {users.map((usr) => (
              <div className="flex items-start rounded-lg p-4" key={usr.handle}>
                <div className="flex-1">
                  <a href={`/user/${usr.handle}`}>
                    <h3 className="font-bold text-xl">{usr.name}</h3>
                    <span className="text-gray-500 text-sm">@{usr.handle}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {(currentCategory === 'title' || currentCategory === 'content') &&
          pageSummaries?.length &&
          pageSummaries.length > 0 && (
            <div className="space-y-4">
              {pageSummaries.map((p) => (
                <PageList key={p.id} locale={locale} pageSummary={p} />
              ))}
            </div>
          )}
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-4">
          <PaginationBar currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
