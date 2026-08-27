import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { DEFAULT_SITE_ORIGIN } from "./metadata";

/** SSR では現在の Request、ブラウザでは表示中の origin を使う。 */
export const getSiteOrigin = createIsomorphicFn()
	.client(() => globalThis.location?.origin ?? DEFAULT_SITE_ORIGIN)
	.server(() => {
		try {
			return getRequestUrl().origin;
		} catch {
			return (
				(typeof process !== "undefined"
					? process.env.APP_BASE_URL
					: undefined) ?? DEFAULT_SITE_ORIGIN
			);
		}
	});
