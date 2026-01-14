import { headers } from "next/headers";

import { auth } from "@/auth";

async function getSession() {
	return await auth.api.getSession({
		headers: await headers(),
	});
}

export async function getCurrentUser() {
	const session = await getSession();
	return session?.user ?? null;
}
