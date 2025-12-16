import { Hash } from "lucide-react";
import type { Tags } from "@/db/types";
import { Link } from "@/i18n/routing";

type TagListProps = {
	tag: Tags[];
};

export function PageTagList({ tag }: TagListProps) {
	return (
		<div className="flex flex-wrap gap-2 pt-2 pb-3">
			{tag.map((tag) => (
				<Link
					className="flex items-center gap-1 px-3 h-[32px] no-underline! bg-secondary rounded-full text-sm text-secondary-foreground"
					href={`/search?query=${encodeURIComponent(tag.name)}&category=tags&tagPage=true`}
					key={tag.id}
				>
					<Hash className="w-3 h-3" />
					<span>{tag.name}</span>
				</Link>
			))}
		</div>
	);
}
