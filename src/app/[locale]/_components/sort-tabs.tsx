'use client';

import { useQueryState } from 'nuqs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SortTabsProps {
  defaultSort?: string;
}

export function SortTabs({ defaultSort = 'popular' }: SortTabsProps) {
  const [sort, setSort] = useQueryState('sort', {
    defaultValue: defaultSort,
    shallow: false,
  });

  return (
    <div className="my-4 flex justify-center">
      <Tabs className="w-11/12" onValueChange={setSort} value={sort}>
        <TabsList className=" flex w-full justify-center rounded-full">
          <TabsTrigger className="w-1/2 rounded-full text-xs" value="popular">
            Popular
          </TabsTrigger>
          <TabsTrigger className="w-1/2 rounded-full text-xs" value="new">
            New
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
