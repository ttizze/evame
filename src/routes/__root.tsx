import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import "@/app/globals.css";

export const Route = createRootRoute({
	component: RootComponent,
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
			{/* biome-ignore lint/style/noHeadElement: TanStack Start requires a document head. */}
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
