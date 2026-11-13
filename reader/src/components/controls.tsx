import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { viewQueryState } from "@/app/[locale]/(common-layout)/_components/view-query";
import { IslandProviders } from "./providers";

function Controls({
	locale,
	sourceLocale,
	likeButton,
}: {
	locale: string;
	sourceLocale: string;
	likeButton: ReactNode;
}) {
	const [view] = useQueryState("view", viewQueryState);
	const hydrated = useHydrated();
	useEffect(() => {
		if (hydrated) document.body.dataset.view = view;
	}, [hydrated, view]);
	return (
		<FloatingControls
			alwaysVisible
			likeButton={likeButton}
			sourceLocale={sourceLocale}
			userLocale={locale}
		/>
	);
}

export function ControlsIsland({
	search,
	...props
}: Parameters<typeof Controls>[0] & { search: string }) {
	return (
		<IslandProviders locale={props.locale} search={search}>
			<Controls {...props} />
		</IslandProviders>
	);
}
