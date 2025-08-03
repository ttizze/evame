"use server";

import { getCurrentUser } from "@/lib/auth-server";
import { updateUserTargetLocales } from "./_db/mutations.server";

export async function saveTargetLocalesAction(locales: string[]) {
	if (!Array.isArray(locales)) return;
	const user = await getCurrentUser();
	if (!user?.id) return;

	await updateUserTargetLocales(user.id, locales.slice(0, 4));
}
