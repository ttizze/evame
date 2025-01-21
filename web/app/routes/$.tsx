import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { supportedLocaleOptions } from "~/constants/languages";
import i18nServer from "~/i18n.server";
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const pathSegments = url.pathname.split("/").filter(Boolean);

	if (pathSegments.length === 0) {
		const locale = (await i18nServer.getLocale(request)) || "en";
		return redirect(`/${locale}`);
	}

	const firstSegment = pathSegments[0];
	if (!supportedLocaleOptions.some((l) => l.code === firstSegment)) {
		const locale = (await i18nServer.getLocale(request)) || "en";
		url.pathname = `/${locale}${url.pathname}`;
		return redirect(url.toString());
	}

	throw new Response("Not Found", { status: 404 });
}

// テンプレのNot Found画面
export default function CatchAllRoute() {
	return (
		<div>
			<p>Not Found</p>
		</div>
	);
}
