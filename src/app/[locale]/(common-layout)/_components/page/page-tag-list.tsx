import { Link } from "@tanstack/react-router";
import { Hash } from "lucide-react";
import { useLocale } from "next-intl";
import type { Tag } from "@/db/types.helpers";

type TagListProps = {
	tag: Tag[];
};

export function PageTagList({ tag }: TagListProps) {
	const locale = useLocale();
	return (
		<div className="flex flex-wrap gap-2 pt-2 pb-3">
			{tag.map((tag) => (
				<Link
					className="flex items-center gap-1 px-3 h-[32px] no-underline! bg-secondary rounded-full text-sm text-secondary-foreground"
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
				</Link>
			))}
		</div>
	);
}
