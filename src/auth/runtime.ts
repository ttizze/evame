import type { Auth } from "./auth";

let configuredAuth: Auth | undefined;

/** Better AuthをTanStack Startのrouteへ注入する。Worker secretsはここへ保持しない。 */
export function configureAuth(auth: Auth): void {
	configuredAuth = auth;
}

export function getAuth(): Auth {
	if (!configuredAuth) {
		throw new Error("認証が設定されていません");
	}
	return configuredAuth;
}
