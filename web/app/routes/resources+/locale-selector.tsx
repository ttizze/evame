// app/routes/resources+/locale-selector.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { localeCookie } from "~/i18n.server";

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const newLocale = formData.get("locale")?.toString() || "en";
	const userName = formData.get("userName")?.toString() || "";
	const slug = formData.get("slug")?.toString() || "";

	const headers = new Headers();
	headers.append("Set-Cookie", await localeCookie.serialize(newLocale));

	let redirectPath = `/${newLocale}`;
	if (userName && slug) {
		redirectPath += `/user/${userName}/page/${slug}`;
	} else if (userName) {
		redirectPath += `/user/${userName}`;
	}

	return redirect(redirectPath, { headers });
}
