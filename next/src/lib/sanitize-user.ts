import type { SanitizedUser } from "@/app/types";
import type { User } from "@prisma/client";

export function sanitizeUser(user: User): SanitizedUser {
	const { email, provider, plan, ...sanitizedUser } = user;
	return sanitizedUser;
}
