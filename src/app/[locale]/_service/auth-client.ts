import {
	customSessionClient,
	magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { getAuth } from "@/auth";

export const authClient = createAuthClient({
	plugins: [
		customSessionClient<ReturnType<typeof getAuth>>(),
		magicLinkClient(),
	],
	baseURL: import.meta.env.VITE_PUBLIC_DOMAIN,
});
