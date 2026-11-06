import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { TocTrigger } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/sub-header/toc-trigger";
import type { TocItem } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_domain/extract-toc-items";
import { IslandProviders } from "./providers";

export function ArticleToolsIsland({
	locale,
	search,
	handle,
	slug,
	tocItems,
}: {
	locale: string;
	search: string;
	handle: string;
	slug: string;
	tocItems: TocItem[];
}) {
	const { data: session } = authClient.useSession();
	const hydrated = useHydrated();
	return (
		<IslandProviders locale={locale} search={search}>
			<div className="flex items-center gap-4">
				{hydrated && session?.user.handle === handle && (
					<a aria-label="Edit page" href={`/${locale}/${handle}/${slug}/edit`}>
						✎
					</a>
				)}
				<TocTrigger items={tocItems} />
			</div>
		</IslandProviders>
	);
}
