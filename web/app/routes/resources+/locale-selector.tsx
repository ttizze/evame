// app/routes/resources+/locale-selector.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { localeCookie } from "~/i18n.server";

// ※表示自体はしないので loader は省略 or 空
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const newLocale = formData.get("locale")?.toString() || "en";
  const userName = formData.get("userName")?.toString() || "";
  const slug = formData.get("slug")?.toString() || "";

  // Cookieにロケールを保存
  const headers = new Headers();
  headers.append("Set-Cookie", await localeCookie.serialize(newLocale));

  let redirectPath = `/${newLocale}`;
  if (userName && slug) {
    redirectPath += `/${userName}/page/${slug}`;
  } else if (userName) {
    redirectPath += `/${userName}`;
  }

  return redirect(redirectPath, { headers });
}