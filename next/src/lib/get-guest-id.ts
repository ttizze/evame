import { cookies } from "next/headers";

export async function getGuestId() {
	const cookieStore = await cookies();
	return cookieStore.get("guestId")?.value;
}
