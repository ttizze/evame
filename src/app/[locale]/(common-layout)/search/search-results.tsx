import type { ScriptureListItem } from "@/components/scripture/types";
import { getSearchCopy } from "./constants";

export function SearchResults({
	locale,
	results,
	query,
}: {
	locale: string;
	results: ScriptureListItem[];
	query: string;
}) {
	const copy = getSearchCopy(locale);

	if (results.length === 0) {
		return (
			<p className="text-muted-foreground" role="status">
				{copy.noResults}
			</p>
		);
	}

	return (
		<section aria-label={`${copy.title}: ${query}`} className="space-y-4">
			{results.map((item) => (
				<article
					className="rounded-2xl border border-border/60 p-4 transition-colors hover:bg-muted/30"
					key={item.id}
				>
					<a aria-label={item.title} className="block" href={item.href}>
						<h2 className="text-lg font-semibold">{item.title}</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{item.hierarchy.join(" / ")}
						</p>
						{item.paliTitle ? (
							<p className="mt-1 text-sm text-muted-foreground" lang="pi">
								{item.paliTitle}
							</p>
						) : null}
					</a>
				</article>
			))}
		</section>
	);
}
