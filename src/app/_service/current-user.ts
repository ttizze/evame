import { auth } from "@/auth";

export async function getCurrentUserFromHeaders(headers: Headers) {
	const session = await auth.api.getSession({ headers });
	return session?.user ?? null;
}
