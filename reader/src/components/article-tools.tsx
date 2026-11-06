import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { TocTrigger } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/sub-header/toc-trigger";
import type { TocItem } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_domain/extract-toc-items";

export function ArticleToolsIsland({
	locale,
	handle,
	slug,
	tocItems,
}: {
	locale: string;
	handle: string;
	slug: string;
	tocItems: TocItem[];
}) {
	const { data: session } = authClient.useSession();
	const hydrated = useHydrated();
	return (
		<div className="flex items-center gap-4">
			{hydrated && session?.user.handle === handle && (
				<a aria-label="Edit page" href={`/${locale}/${handle}/${slug}/edit`}>
					✎
				</a>
			)}
			<TocTrigger items={tocItems} />
		</div>
	);
}
