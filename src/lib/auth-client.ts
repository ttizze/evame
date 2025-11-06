import {
	customSessionClient,
	magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/auth";

/**
 * baseURLを推論します。
 * better-authは以下の順序でbaseURLを解決します：
 * 1. 明示的に渡されたbaseURL
 * 2. ブラウザ環境ではwindow.location.origin
 *
 * SSR時にbaseURLが未定義になることを防ぐため、常に値を設定します。
 */
function getBaseURL(): string | undefined {
	// 1. NEXT_PUBLIC_DOMAINが設定されている場合は優先
	if (process.env.NEXT_PUBLIC_DOMAIN) {
		return process.env.NEXT_PUBLIC_DOMAIN;
	}

	// 2. ブラウザ環境ではwindow.location.originを使用
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	// 3. SSR時はundefinedを返す（better-authが自動推論を試みる）
	// ただし、better-authの推奨に従い、可能な限り明示的に設定する
	return undefined;
}

export const authClient = createAuthClient({
	plugins: [customSessionClient<typeof auth>(), magicLinkClient()],
	/** The base URL of the server (optional if you're using the same domain) */
	baseURL: getBaseURL(),
	/** The path to the auth API route */
	apiPath: "/api/auth",
});
