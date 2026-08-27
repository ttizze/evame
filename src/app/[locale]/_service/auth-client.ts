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
	// 1. ブラウザ環境では、デプロイ先のoriginへ同一オリジンで送る
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	// 2. SSRでは設定済みの公開ドメインを使う
	return process.env.NEXT_PUBLIC_DOMAIN;
}

export const authClient = createAuthClient({
	plugins: [customSessionClient<typeof auth>(), magicLinkClient()],
	/** The base URL of the server (optional if you're using the same domain) */
	baseURL: getBaseURL(),
	/** The path to the auth API route */
	apiPath: "/api/auth",
});
