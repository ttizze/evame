import { Hash } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { fetchPopularTags, type PopularTag } from './_db/queries.server';

interface PopularTagsListProps {
  limit: number;
}

export default async function PopularTagsList({ limit }: PopularTagsListProps) {
  // Fetch popular tags based on usage count
  const popularTags = await fetchPopularTags(limit);

  if (popularTags.length === 0) {
    return <p className="text-muted-foreground">No tags found</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {popularTags.map((tag: PopularTag) => (
        <Link
          className="no-underline! flex h-[32px] items-center gap-1 rounded-full bg-secondary px-3 text-secondary-foreground text-sm transition-colors hover:bg-secondary/80"
          href={`/search?query=${encodeURIComponent(tag.name)}&category=tags&tagPage=true`}
          key={tag.id}
        >
          <Hash className="h-3 w-3" />
          <span>{tag.name}</span>
          <span className="ml-1 text-muted-foreground text-xs">
            ({tag._count.pages})
          </span>
        </Link>
      ))}
    </div>
  );
}
