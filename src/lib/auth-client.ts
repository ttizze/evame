import {
	customSessionClient,
	magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/auth";

const inferredBaseURL = (() => {
	if (process.env.NEXT_PUBLIC_DOMAIN) {
		return process.env.NEXT_PUBLIC_DOMAIN;
	}
	if (typeof window !== "undefined") {
		return window.location.origin;
	}
	return undefined;
})();

export const authClient = createAuthClient({
	plugins: [customSessionClient<typeof auth>(), magicLinkClient()],
	/** The base URL of the server (optional if you're using the same domain) */
	baseURL: inferredBaseURL,
	/** The path to the auth API route */
	apiPath: "/api/auth",
});
