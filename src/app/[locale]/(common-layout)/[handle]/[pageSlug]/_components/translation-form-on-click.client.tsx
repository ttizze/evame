import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { subscribeTranslationForm } from "../../../../../../../shared/translation-form-events";

const AddAndVoteTranslations = lazy(async () => ({
	default: (
		await import("./translation-section/add-and-vote-translations.client")
	).AddAndVoteTranslations,
}));

export function TranslationFormOnClick({ pathname }: { pathname: string }) {
	const [active, setActive] =
		useState<Parameters<Parameters<typeof subscribeTranslationForm>[0]>[0]>(
			null,
		);
	useEffect(() => {
		void pathname;
		setActive(null);
		return subscribeTranslationForm(setActive);
	}, [pathname]);
	return active
		? createPortal(
				<Suspense fallback={null}>
					<AddAndVoteTranslations open segmentId={active.segmentId} />
				</Suspense>,
				active.rootEl,
			)
		: null;
}
