import type { Tag } from '@prisma/client';
import { Hash } from 'lucide-react';
import { Link } from '@/i18n/routing';

type TagListProps = {
  tag: Tag[];
};

export function PageTagList({ tag }: TagListProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-2 pb-3">
      {tag.map((tag) => (
        <Link
          className="no-underline! flex h-[32px] items-center gap-1 rounded-full bg-secondary px-3 text-secondary-foreground text-sm"
          href={`/search?query=${encodeURIComponent(tag.name)}&category=tags&tagPage=true`}
          key={tag.id}
        >
          <Hash className="h-3 w-3" />
          <span>{tag.name}</span>
        </Link>
      ))}
    </div>
  );
}
