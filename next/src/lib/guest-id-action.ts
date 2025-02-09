"use server";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export async function setGuestId(): Promise<{ success: boolean; guestId: string }> {
	const cookieStore = await cookies();
	const guestId = cookieStore.get("guestId");

  if (!guestId) {
    const newGuestId = randomUUID();
    cookieStore.set("guestId", newGuestId, {
			secure: true,
			httpOnly: true,
			sameSite: "strict",
			path: "/",
		});
		return { success: true, guestId: newGuestId };
	}

	return { success: true, guestId: guestId.value };
}
