import { getRequestHeaders } from "@tanstack/react-start/server";

import { getCurrentUserFromHeaders } from "./current-user";

export async function getCurrentUser() {
	return getCurrentUserFromHeaders(new Headers(getRequestHeaders()));
}
