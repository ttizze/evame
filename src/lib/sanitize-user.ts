import type { SanitizedUser } from "@/app/types";
import type { Users } from "@/db/types";

export function sanitizeUser(user: Users): SanitizedUser {
	const { email: _email, provider: _provider, ...sanitizedUser } = user;
	return sanitizedUser;
}
