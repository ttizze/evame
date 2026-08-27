/// <reference types="vite/client" />

import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";

export const ROOT_LANGUAGE = "en";
export const rootMetadata = {
	title: "Digital Buddhism",
	description:
		"An open platform for reading Buddhist scriptures and comparing translations across languages.",
} as const;

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
	return (
		<html lang={ROOT_LANGUAGE}>
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
