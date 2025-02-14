import { stringify } from "node:querystring";
import { useRouter } from "@/i18n/routing";
import { useRouter as useTopLoaderRouter } from "nextjs-toploader/app";

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
			const queryString = href.query ? `?${stringify(href.query)}` : "";
			const hrefString = `${href.pathname}${queryString}`;
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
