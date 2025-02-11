import type { User } from "@prisma/client";

export type SanitizedUser = Omit<
	User,
	"email" | "provider" | "plan" | "emailVerified" | "id"
>;

export interface ActionState {
	error?: string;
	success: boolean;
	message?: string;
}
