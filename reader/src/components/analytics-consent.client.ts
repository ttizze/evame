import {
	analyticsConsentStates,
	analyticsConsentStorageKey,
	createAnalyticsScripts,
} from "@/app/[locale]/_components/analytics-consent";

class AnalyticsConsent extends HTMLElement {
	private scripts: HTMLScriptElement[] = [];

	connectedCallback() {
		this.update(localStorage.getItem(analyticsConsentStorageKey));
		this.addEventListener("click", this.selectConsent);
	}

	disconnectedCallback() {
		this.removeEventListener("click", this.selectConsent);
		for (const script of this.scripts) script.remove();
		this.scripts = [];
	}

	private selectConsent = (event: MouseEvent) => {
		const consent = (event.target as Element).closest<HTMLButtonElement>(
			"[data-consent]",
		)?.dataset.consent;
		if (consent !== "accepted" && consent !== "rejected") return;
		localStorage.setItem(analyticsConsentStorageKey, consent);
		this.update(consent);
	};

	private update(consent: string | null) {
		this.hidden = analyticsConsentStates.some((state) => state === consent);
		const trackingId = this.dataset.trackingId;
		if (consent === "accepted" && trackingId && this.scripts.length === 0) {
			this.scripts = createAnalyticsScripts(trackingId);
			document.head.append(...this.scripts);
		}
	}
}

customElements.define("evame-analytics-consent", AnalyticsConsent);
