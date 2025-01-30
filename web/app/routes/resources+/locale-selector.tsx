// app/routes/resources+/locale-selector.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { localeCookie } from "~/i18n.server";

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const newLocale = formData.get("locale")?.toString() || "en";
	const currentUrlString = formData.get("currentUrl")?.toString() || "";

	// ここで request.url は完全な絶対URL (例: https://example.com/current-path)
	// 相対パス currentUrlString を解決するため第二引数に指定
	const requestUrl = new URL(request.url);
	const currentUrl = new URL(currentUrlString, requestUrl);

	const headers = new Headers();
	headers.append("Set-Cookie", await localeCookie.serialize(newLocale));

	const pathSegments = currentUrl.pathname.split("/").filter(Boolean);

	pathSegments.shift();

	pathSegments.unshift(newLocale);

	// 新しいパスを組み立て
	const newPath = `/${pathSegments.join("/")}`;
	// 検索パラメータやハッシュは元のまま付与
	const finalUrl = new URL(
		newPath + currentUrl.search + currentUrl.hash,
		currentUrl.origin,
	);

	return redirect(finalUrl.toString(), { headers });
}
