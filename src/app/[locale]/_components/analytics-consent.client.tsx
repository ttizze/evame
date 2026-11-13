import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	analyticsConsentStates,
	analyticsConsentStorageKey,
	createAnalyticsScripts,
} from "../../../../shared/analytics-consent";

type AnalyticsConsentState = (typeof analyticsConsentStates)[number];

export function AnalyticsConsent({
	gaTrackingId,
	locale,
	message,
}: {
	gaTrackingId: string;
	locale: string;
	message: {
		title: string;
		description: string;
		accept: string;
		decline: string;
		privacyLink: string;
	};
}) {
	const [consent, setConsent] = useState<
		AnalyticsConsentState | null | undefined
	>(undefined);

	useEffect(() => {
		const saved = window.localStorage.getItem(analyticsConsentStorageKey);
		setConsent(
			analyticsConsentStates.includes(saved as AnalyticsConsentState)
				? (saved as AnalyticsConsentState)
				: null,
		);
	}, []);

	useEffect(() => {
		if (consent !== "accepted" || !gaTrackingId) return;

		const scripts = createAnalyticsScripts(gaTrackingId);
		document.head.append(...scripts);
		return () => {
			for (const script of scripts) script.remove();
		};
	}, [consent, gaTrackingId]);

	const handleAccept = () => {
		window.localStorage.setItem(analyticsConsentStorageKey, "accepted");
		setConsent("accepted");
	};

	const handleDecline = () => {
		window.localStorage.setItem(analyticsConsentStorageKey, "rejected");
		setConsent("rejected");
	};

	if (consent === undefined) {
		return null;
	}

	return (
		<>
			{consent === null && (
				<div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-3 sm:w-[420px] md:bottom-5 md:right-5">
					<section
						aria-label={message.title}
						className="rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur"
					>
						<p className="font-semibold text-sm md:text-base">
							{message.title}
						</p>
						<p className="mt-2 text-muted-foreground text-xs md:text-sm">
							{message.description}{" "}
							<a className="underline" href={`/${locale}/privacy`}>
								{message.privacyLink}
							</a>
						</p>
						<div className="mt-3 flex justify-end gap-2">
							<Button
								onClick={handleDecline}
								size="sm"
								type="button"
								variant="outline"
							>
								{message.decline}
							</Button>
							<Button onClick={handleAccept} size="sm" type="button">
								{message.accept}
							</Button>
						</div>
					</section>
				</div>
			)}
		</>
	);
}
