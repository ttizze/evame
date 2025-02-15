import type { User } from "@prisma/client";
import type { typeToFlattenedError } from "zod";
export type SanitizedUser = Omit<
	User,
	"email" | "provider" | "plan" | "emailVerified" | "id"
>;

export type ActionResponse<T = void, U = Record<string, unknown>> = {
	success: boolean;
	message?: string;
	data?: T;
	zodErrors?: typeToFlattenedError<U>["fieldErrors"];
};
