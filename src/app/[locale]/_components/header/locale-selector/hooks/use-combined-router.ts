import { useRouter as useTopLoaderRouter } from "nextjs-toploader/app";
import { useRouter } from "@/i18n/routing";

interface NavigateOptions {
	scroll?: boolean;
}

type Href =
	| string
	| {
			pathname: string;
			query?: Record<string, string | number | boolean | undefined>;
	  };

export function useCombinedRouter() {
	const topLoader = useTopLoaderRouter();
	const intlRouter = useRouter();

	const push = async (href: Href, options?: NavigateOptions) => {
		if (typeof href === "object") {
			const searchParams = new URLSearchParams();
			if (href.query) {
				for (const [key, value] of Object.entries(href.query)) {
					if (value !== undefined) {
						searchParams.append(key, String(value));
					}
				}
			}
			const queryString = searchParams.toString();
			const hrefString = `${href.pathname}${queryString ? `?${queryString}` : ""}`;
			topLoader.push(hrefString, options);
			await intlRouter.push(href, options);
		} else {
			topLoader.push(href, options);
			await intlRouter.push(href, options);
		}
	};

	return {
		...intlRouter,
		push,
	};
}
