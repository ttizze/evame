import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export async function ensureGuestId(): Promise<string> {
	const cookieStore = await cookies();
	let guestId = cookieStore.get("guestId")?.value;
	if (!guestId) {
		guestId = randomUUID();
		cookieStore.set("guestId", guestId, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "strict",
		});
	}
	return guestId;
}
