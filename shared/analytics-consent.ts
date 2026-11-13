export const analyticsConsentStorageKey = "evame.analytics-consent";
export const analyticsConsentStates = ["accepted", "rejected"] as const;

export function createAnalyticsScripts(gaTrackingId: string) {
	const externalScript = document.createElement("script");
	externalScript.async = true;
	externalScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaTrackingId)}`;
	const configScript = document.createElement("script");
	configScript.textContent = `window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',${JSON.stringify(gaTrackingId).replaceAll("<", "\\u003c")});`;
	return [externalScript, configScript];
}
