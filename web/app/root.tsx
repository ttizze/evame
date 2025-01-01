import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	isRouteErrorResponse,
	useLoaderData,
	useLocation,
	useRouteError,
	useRouteLoaderData,
} from "@remix-run/react";
import { captureRemixErrorBoundaryError, withSentry } from "@sentry/remix";
import { useEffect } from "react";
import { useChangeLanguage } from "remix-i18next/react";
import { useHydrated } from "remix-utils/use-hydrated";
import { ThemeProvider } from "~/components/theme-provider";
import * as gtag from "~/gtags.client";
import i18nServer, { localeCookie } from "~/i18n.server";
import { Footer } from "~/routes/resources+/footer";
import { Header } from "~/routes/resources+/header";
import tailwind from "~/tailwind.css?url";
import { authenticator } from "~/utils/auth.server";
import { commitSession, getSession } from "~/utils/session.server";
export async function loader({ request }: LoaderFunctionArgs) {
	const isDevelopment = process.env.NODE_ENV === "development";

	const gaTrackingId = isDevelopment
		? ""
		: (process.env.GOOGLE_ANALYTICS_ID ?? "");
	const currentUser = await authenticator.isAuthenticated(request);
	const session = await getSession(request.headers.get("Cookie"));
	const guestId = session.get("guestId");
	if (!currentUser && !guestId) {
		session.set("guestId", crypto.randomUUID());
		return redirect(request.url, {
			headers: { "Set-Cookie": await commitSession(session) },
		});
	}
	const locale = (await i18nServer.getLocale(request)) || "en";
	const url = new URL(request.url);
	const pathSegments: string[] = url.pathname.split("/").filter(Boolean);
	if (pathSegments.length === 0) {
		url.pathname = `/${locale}${url.pathname}`;
		return redirect(url.toString());
	}
	const currentLocale = pathSegments[0];
	return data(
		{
			isDevelopment,
			currentUser,
			locale: currentLocale,
			gaTrackingId,
		},
		{
			headers: { "Set-Cookie": await localeCookie.serialize(currentLocale) },
		},
	);
}

export const handle = {
	i18n: "translation",
};

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: tailwind },
	{
		rel: "preconnect",
		href: "https://fonts.googleapis.com",
	},
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "preload",
		as: "style",
		href: "https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=BIZ+UDPGothic:wght@400;700&display=swap",
		fetchpriority: "high",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=BIZ+UDPGothic:wght@400;700&display=swap",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	const data = useRouteLoaderData<typeof loader>("root");
	const { gaTrackingId, locale } = data ?? {};
	const location = useLocation();
	const isEditorPage = /^\/[\w-]+\/user\/[\w-]+\/page\/[\w-]+\/edit$/.test(
		location.pathname,
	);

	useEffect(() => {
		if (gaTrackingId?.length) {
			gtag.pageview(location.pathname, gaTrackingId);
		}
	}, [location, gaTrackingId]);
	return (
		<html lang={locale ?? "en"} suppressHydrationWarning={true}>
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, interactive-widget=resizes-content, maximum-scale=1"
				/>
				<Meta />
				<link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<Links />
			</head>
			<body
				className={`flex flex-col min-h-svh transition-colors duration-300 ${isEditorPage ? "overflow-hidden " : null}`}
			>
				{!gaTrackingId ? null : (
					<>
						<script
							async
							src={`https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`}
						/>
						<script
							async
							id="gtag-init"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
							dangerouslySetInnerHTML={{
								__html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaTrackingId}', {
                  page_path: window.location.pathname,
                });
              `,
							}}
						/>
					</>
				)}
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

function App() {
	const { locale } = useLoaderData<typeof loader>();
	useChangeLanguage(locale);
	const location = useLocation();
	const isSpecialLayout = /^\/[\w-]+\/user\/[\w-]+\/page\/[\w-]+\/edit$/.test(
		location.pathname,
	);

	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<CommonLayout isSpecialLayout={isSpecialLayout}>
				<Outlet />
			</CommonLayout>
		</ThemeProvider>
	);
}

export default withSentry(App);

function CommonLayout({
	children,
	isSpecialLayout = true,
}: { children: React.ReactNode; isSpecialLayout: boolean }) {
	const { currentUser, locale } = useLoaderData<typeof loader>();

	if (isSpecialLayout) {
		return <>{children}</>;
	}

	return (
		<>
			<Header currentUser={currentUser} locale={locale} />
			<main className="mb-5 mt-3 md:mt-5 flex-grow tracking-wider">
				<div className="mx-auto px-2 max-w-4xl">{children}</div>
			</main>
			<Footer />
		</>
	);
}

export function ErrorBoundary() {
	const data = useRouteLoaderData<typeof loader>("root");
	const isDevelopment = data?.isDevelopment;
	const error = useRouteError();
	const isHydrated = useHydrated();
	captureRemixErrorBoundaryError(error);

	if (isDevelopment) {
		console.error(error);
		return (
			<div className="text-left p-4 bg-red-100 border border-red-400 rounded">
				<pre className="whitespace-pre-wrap break-words">
					{isRouteErrorResponse(error)
						? `${error.status} ${error.statusText}`
						: error instanceof Error
							? error.stack
							: JSON.stringify(error, null, 2)}
				</pre>
			</div>
		);
	}

	return !isHydrated ? null : (
		<div className="text-center flex flex-col items-center justify-center min-h-screen bg-gray-100">
			{isRouteErrorResponse(error) ? (
				<>
					<h1 className="text-6xl font-bold text-gray-800 mb-4">
						{error.status}
					</h1>
					<p className="text-2xl text-gray-600 mb-8">
						{error.status === 404 ? "Page not found" : error.statusText}
					</p>
				</>
			) : error instanceof Error ? (
				<>
					<h1 className="text-6xl font-bold text-gray-800 mb-4">Error</h1>
					<p className="text-2xl text-gray-600 mb-8">{error.message}</p>
				</>
			) : (
				<h1 className="text-6xl font-bold text-gray-800 mb-4">Unknown error</h1>
			)}
			<a
				href="/"
				className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
			>
				Back to home
			</a>
		</div>
	);
}
