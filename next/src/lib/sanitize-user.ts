import type { SanitizedUser } from "@/app/types";
import type { User } from "@prisma/client";

export function sanitizeUser(user: User): SanitizedUser {
	const {
		email: _email,
		provider: _provider,
		plan: _plan,
		...sanitizedUser
	} = user;
	return sanitizedUser;
}
