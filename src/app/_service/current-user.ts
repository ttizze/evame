import { getAuth } from "@/auth";

export async function getCurrentUserFromHeaders(headers: Headers) {
	const session = await getAuth().api.getSession({ headers });
	return session?.user ?? null;
}
