import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
	// This typically corresponds to the `[locale]` segment
	const locale = await requestLocale;

	return {
		locale,
		messages: (await import("../../messages/en.json")).default,
	};
});
