// app/routes/resources+/locale-selector.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { localeCookie } from "~/i18n.server";

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const newLocale = formData.get("locale")?.toString() || "en";
	const handle = formData.get("handle")?.toString() || "";
	const slug = formData.get("slug")?.toString() || "";

	const headers = new Headers();
	headers.append("Set-Cookie", await localeCookie.serialize(newLocale));

	let redirectPath = `/${newLocale}`;
	if (handle && slug) {
		redirectPath += `/user/${handle}/page/${slug}`;
	} else if (handle) {
		redirectPath += `/user/${handle}`;
	}

	return redirect(redirectPath, { headers });
}
