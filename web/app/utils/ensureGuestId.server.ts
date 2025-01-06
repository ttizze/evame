
import { getSession } from "~/utils/session.server";
import type { Session } from "@remix-run/node";

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
