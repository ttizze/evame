import type { User } from "@prisma/client";
import type { SanitizedUser } from "@/app/types";

export function sanitizeUser(user: User): SanitizedUser {
	const { email: _email, provider: _provider, ...sanitizedUser } = user;
	return sanitizedUser;
}
