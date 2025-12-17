import type { SanitizedUser, User } from "@/db/types.helpers";

export function sanitizeUser(user: User): SanitizedUser {
	const {
		email: _email,
		provider: _provider,
		emailVerified: _emailVerified,
		id: _id,
		...sanitizedUser
	} = user;
	return sanitizedUser;
}
