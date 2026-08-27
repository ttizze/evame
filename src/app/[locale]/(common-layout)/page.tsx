import { BookOpenIcon } from "lucide-react";
import type { ReactNode } from "react";
import { getScriptureCopy } from "@/components/scripture/copy";
import type { ScriptureListItem } from "@/components/scripture/types";
import { Button } from "@/components/ui/button";
import { PageListContainer } from "./_components/page/page-list-container/server";

type HomePageProps = {
	items: ScriptureListItem[];
	locale: string;
};

export default function HomePage({ items, locale }: HomePageProps): ReactNode {
	const labels = getScriptureCopy(locale);

	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			<PageListContainer icon={BookOpenIcon} title={labels.title}>
				<p className="text-sm text-muted-foreground">{labels.catalog}</p>
				{items.length === 0 ? (
					<div
						className="border-y border-dashed px-6 py-12 text-center text-muted-foreground"
						role="status"
					>
						{labels.empty}
					</div>
				) : (
					<div>
						{items.map((item, index) => (
							<article
								className="grid gap-4 py-4 border-b last:border-b-0 grid-cols-[max-content_1fr]"
								key={item.id}
							>
								<div className="text-lg font-medium text-muted-foreground self-start">
									{index + 1}
								</div>
								<div className="grid grid-rows-[auto_auto_auto] gap-1 min-w-0">
									<div className="grid grid-cols-[1fr_auto] gap-2">
										<a className="block overflow-hidden" href={item.href}>
											<span className="line-clamp-1 break-all overflow-wrap-anywhere text-lg font-semibold">
												{item.title}
											</span>
										</a>
									</div>
									<p className="text-sm text-muted-foreground">
										{item.hierarchy.join(" / ")}
									</p>
									{item.paliTitle ? (
										<p className="text-sm text-muted-foreground" lang="pi">
											{item.paliTitle}
										</p>
									) : null}
									<div className="flex items-center gap-3 mt-2">
										<span className="text-sm text-muted-foreground">
											{labels.translationCount(item.translationCount)}
										</span>
										<Button asChild className="h-auto px-0 py-0" variant="link">
											<a href={item.href}>{labels.read}</a>
										</Button>
									</div>
								</div>
							</article>
						))}
					</div>
				)}
			</PageListContainer>
		</div>
	);
}
