import type { User } from "@prisma/client";

export type SanitizedUser = Omit<
	User,
	"email" | "provider" | "plan" | "emailVerified" | "id"
>;

export type ActionState = {
	error?: string;
	success?: string;
	[key: string]: string | boolean | undefined;
};
