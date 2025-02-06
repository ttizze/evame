import { NavigationLink } from "@/components/navigation-link";
import type { Tag } from "@prisma/client";
import { Hash } from "lucide-react";

type TagListProps = {
	tag: Tag[];
};

export function TagList({ tag }: TagListProps) {
	return (
		<div className="flex flex-wrap gap-2 pt-2 pb-3">
			{tag.map((tag) => (
				<NavigationLink
					href={`/search?query=${encodeURIComponent(tag.name)}&category=tags&tagpage=true`}
					key={tag.id}
					className="flex items-center gap-1 px-3 h-[32px] !no-underline bg-secondary rounded-full text-sm text-secondary-foreground"
				>
					<button type="button" className="hover:text-destructive ml-1">
						<Hash className="w-3 h-3" />
					</button>
					<span>{tag.name}</span>
				</NavigationLink>
			))}
		</div>
	);
}
