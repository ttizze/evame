import { Hash } from "lucide-react";
import type { PageCardLocalizedType } from "~/routes/$locale+/functions/queries.server";
import { LocaleLink } from "./LocaleLink";

type TagListProps = {
	tagPages: PageCardLocalizedType["tagPages"];
};

export function TagList({ tagPages }: TagListProps) {
	return (
		<div className="flex flex-wrap gap-2 pt-2 pb-3">
			{tagPages.map((tagPage) => (
				<LocaleLink
					to={`/search?query=${encodeURIComponent(tagPage.tag.name)}&category=tags&tagpage=true`}
					key={tagPage.tag.id}
					className="flex items-center gap-1 px-3 h-[32px] !no-underline bg-secondary rounded-full text-sm text-secondary-foreground"
				>
					<button type="button" className="hover:text-destructive ml-1">
						<Hash className="w-3 h-3" />
					</button>
					<span>{tagPage.tag.name}</span>
				</LocaleLink>
			))}
		</div>
	);
}
