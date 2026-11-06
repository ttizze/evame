import { useQueryState } from "nuqs";
import { useEffect } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { PageLikeButtonClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/client";
import { viewQueryState } from "@/app/[locale]/(common-layout)/_components/view-query";
import { IslandProviders } from "./providers";

function Controls({
	locale,
	sourceLocale,
	pageId,
	likeCount,
}: {
	locale: string;
	sourceLocale: string;
	pageId: number | null;
	likeCount: number;
}) {
	const [view] = useQueryState("view", viewQueryState);
	const hydrated = useHydrated();
	useEffect(() => {
		if (hydrated) document.body.dataset.view = view;
	}, [hydrated, view]);
	return (
		<FloatingControls
			likeButton={
				pageId === null ? undefined : (
					<PageLikeButtonClient initialLikeCount={likeCount} pageId={pageId} />
				)
			}
			sourceLocale={sourceLocale}
			userLocale={locale}
		/>
	);
}

export function ControlsIsland(props: Parameters<typeof Controls>[0]) {
	return (
		<IslandProviders locale={props.locale}>
			<Controls {...props} />
		</IslandProviders>
	);
}
