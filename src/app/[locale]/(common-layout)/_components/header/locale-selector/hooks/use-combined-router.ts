import { useLocale } from "next-intl";
import { useRouter as useTopLoaderRouter } from "nextjs-toploader/app";
import { getPathname, useRouter } from "@/i18n/routing";

interface NavigateOptions {
	scroll?: boolean;
	// next-intl specific option to switch locales
	locale?: string;
}

type Href =
	| string
	| {
			pathname: string;
			// Query string key/values
			query?: Record<string, string | number | boolean | undefined>;
	  };

export function useCombinedRouter() {
	const topLoader = useTopLoaderRouter();
	const intlRouter = useRouter();
	const currentLocale = useLocale();

	const push = async (href: Href, options?: NavigateOptions) => {
		// Build a localized URL string for the top-loader navigation
		const buildHrefString = () => {
			if (typeof href === "string") {
				const localizedPath = getPathname({
					href,
					locale: (options?.locale ?? currentLocale) as string,
				});
				return localizedPath;
			}
			const searchParams = new URLSearchParams();
			if (href.query) {
				for (const [key, value] of Object.entries(href.query)) {
					if (value !== undefined) searchParams.append(key, String(value));
				}
			}
			const localizedPath = getPathname({
				href: { pathname: href.pathname, query: href.query },
				locale: (options?.locale ?? currentLocale) as string,
			});
			return `${localizedPath}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
		};

		const hrefString = buildHrefString();
		topLoader.push(hrefString, { scroll: options?.scroll });
		await intlRouter.push(href, options);
	};

	return {
		...intlRouter,
		push,
	};
}
