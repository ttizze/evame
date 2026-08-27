/// <reference types="vite/client" />

import {
	createRootRoute,
	HeadContent,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { isSupportedLocale, type SupportedLocale } from "@/domain/locales";
import appCss from "../styles.css?url";

export const ROOT_LANGUAGE: SupportedLocale = "en";
export const rootMetadata = {
	title: "Digital Buddhism",
	description:
		"An open platform for reading Buddhist scriptures and comparing translations across languages.",
} as const;

export function getRootLanguage(pathname: string): SupportedLocale {
	const firstSegment = /^\/([^/]+)/u.exec(pathname)?.[1];
	return isSupportedLocale(firstSegment) ? firstSegment : ROOT_LANGUAGE;
}

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				name: "description",
				content: rootMetadata.description,
			},
			{ title: rootMetadata.title },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
});

export function RootDocument({ children }: { children: ReactNode }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const language = getRootLanguage(pathname);

	return (
		<html lang={language}>
			<head>
				<HeadContent />
			</head>
			<body>
				<div id="root">{children}</div>
				<Scripts />
			</body>
		</html>
	);
}
