import { Link } from "@/i18n/routing";
import type { Tag } from "@prisma/client";
import { Hash } from "lucide-react";

type TagListProps = {
	tag: Tag[];
};

export function PageTagList({ tag }: TagListProps) {
	return (
		<div className="flex flex-wrap gap-2 pt-2 pb-3">
			{tag.map((tag) => (
				<Link
					href={`/search?query=${encodeURIComponent(tag.name)}&category=tags&tagPage=true`}
					key={tag.id}
					className="flex items-center gap-1 px-3 h-[32px] !no-underline bg-secondary rounded-full text-sm text-secondary-foreground"
				>
					<Hash className="w-3 h-3" />
					<span>{tag.name}</span>
				</Link>
			))}
		</div>
	);
}
