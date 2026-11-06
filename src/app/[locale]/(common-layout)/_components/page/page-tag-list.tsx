import { Hash } from "lucide-react";
import type { Tag } from "@/db/types.helpers";

type TagListProps = {
	tag: Tag[];
	locale: string;
};

export function PageTagList({ tag, locale }: TagListProps) {
	return (
		<div className="flex flex-wrap gap-2 pt-2 pb-3">
			{tag.map((tag) => (
				<a
					className="flex items-center gap-1 px-3 h-[32px] no-underline! bg-secondary rounded-full text-sm text-secondary-foreground"
					href={`/${locale}/search?${new URLSearchParams({ category: "tags", page: "1", query: tag.name, tagPage: "true" })}`}
					key={tag.id}
				>
					<Hash className="w-3 h-3" />
					<span>{tag.name}</span>
				</a>
			))}
		</div>
	);
}
