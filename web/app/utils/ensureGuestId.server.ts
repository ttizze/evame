import type { Session } from "@remix-run/node";
import { getSession } from "~/utils/session.server";

export async function ensureGuestId(request: Request): Promise<{
	session: Session;
	guestId: string;
}> {
	const session = await getSession(request.headers.get("Cookie"));
	let guestId = session.get("guestId");
	if (!guestId) {
		guestId = crypto.randomUUID();
		session.set("guestId", guestId);
	}
	return { session, guestId };
}
