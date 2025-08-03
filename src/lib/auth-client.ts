import {
	customSessionClient,
	magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/auth";
export const authClient = createAuthClient({
	plugins: [customSessionClient<typeof auth>(), magicLinkClient()],
	/** The base URL of the server (optional if you're using the same domain) */
	baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
	/** The path to the auth API route */
	apiPath: "/api/auth",
});
