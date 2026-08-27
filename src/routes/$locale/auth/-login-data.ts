import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSessionUser } from "@/auth/session";

/** ログインrouteのloaderからBetter Authの検証済みセッションだけを参照する。 */
export const hasLoginSession = createServerFn({ method: "GET" }).handler(
	async () => Boolean(await getSessionUser(getRequest())),
);
