import type { SanitizedUser } from "@/app/types";
import type { User } from "@/drizzle/types";

export function sanitizeUser(user: User): SanitizedUser {
	const { email: _email, provider: _provider, ...sanitizedUser } = user;
	return sanitizedUser;
}
