import {
	createRootRoute,
	HeadContent,
	Outlet,
	redirect,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { parseReaderRoute } from "@/app/_domain/reader-route";
import {
	RootErrorComponent,
	RootNotFoundComponent,
	RoutePendingComponent,
} from "./-root-boundaries";

export const Route = createRootRoute({
	beforeLoad: ({ location }) => {
		if (
			typeof window !== "undefined" &&
			parseReaderRoute(location.pathname, location.searchStr)
		) {
			throw redirect({ href: location.href, reloadDocument: true });
		}
	},
	component: RootComponent,
	errorComponent: RootErrorComponent,
	notFoundComponent: RootNotFoundComponent,
	pendingComponent: RoutePendingComponent,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ title: "Evame" },
		],
	}),
	shellComponent: RootDocument,
});

function RootComponent() {
	return <Outlet />;
}

function RootDocument({ children }: { children: ReactNode }) {
	const locale = useRouterState({
		select: (state) => {
			const locale = state.matches.find((match) => match.routeId === "/$locale")
				?.params.locale;
			return typeof locale === "string" ? locale : "en";
		},
	});
	const direction = locale === "ar" || locale === "fa" ? "rtl" : "ltr";

	return (
		<html dir={direction} lang={locale} suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="transition-colors duration-300 antialiased">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
