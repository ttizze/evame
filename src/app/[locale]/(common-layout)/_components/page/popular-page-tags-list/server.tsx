import { Link } from "@tanstack/react-router";
import { Hash } from "lucide-react";
import { fetchPopularTags } from "./_db/queries.server";

interface PopularTagsListProps {
	limit: number;
	locale: string;
}

export default async function PopularTagsList({
	limit,
	locale,
}: PopularTagsListProps) {
	// Fetch popular tags based on usage count
	const popularTags = await fetchPopularTags(limit);

	if (popularTags.length === 0) {
		return <p className="text-muted-foreground">No tags found</p>;
	}

	return (
		<div className="flex flex-wrap gap-2">
			{popularTags.map((tag) => (
				<Link
					className="flex items-center gap-1 px-3 h-[32px] no-underline! bg-secondary rounded-full text-sm text-secondary-foreground hover:bg-secondary/80 transition-colors"
					key={tag.id}
					params={{ locale }}
					search={{
						category: "tags",
						page: 1,
						query: tag.name,
						tagPage: "true",
					}}
					to="/$locale/search"
				>
					<Hash className="w-3 h-3" />
					<span>{tag.name}</span>
					<span className="text-xs text-muted-foreground ml-1">
						({tag._count.pages})
					</span>
				</Link>
			))}
		</div>
	);
}
