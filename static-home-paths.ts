import { supportedLocaleOptions } from "./src/app/_constants/locale";

export const staticHomePaths = new Map(
	supportedLocaleOptions.flatMap(({ code }) =>
		[`/${code}`, `/${code}/`, `/${code}/index.html`, `/${code}.html`].map(
			(path) => [path, code] as const,
		),
	),
);
