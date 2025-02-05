import type { User } from "@prisma/client";
import type { SanitizedUser } from "../types";

export function sanitizeUser(user: User): SanitizedUser {
	const { email, provider, plan, ...sanitizedUser } = user;
	return sanitizedUser;
}
