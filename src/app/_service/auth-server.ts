import { headers } from "next/headers";

import { getCurrentUserFromHeaders } from "./current-user";

export async function getCurrentUser() {
	return getCurrentUserFromHeaders(new Headers(await headers()));
}
