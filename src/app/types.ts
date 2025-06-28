import type { User } from "@prisma/client";
import type { typeToFlattenedError } from "zod";
export type SanitizedUser = Omit<
	User,
	"email" | "provider" | "emailVerified" | "id"
>;
type Failure<U = Record<string, unknown>> = {
	success: false;
	message?: string;
	zodErrors?: typeToFlattenedError<U>["fieldErrors"];
};
type Success<T = undefined> = {
	success: true;
	data: T;
	message?: string;
};
/** 失敗側（success:false に加えて好きなプロパティを合成） */
export type ActionResponse<T = undefined, U = Record<string, unknown>> =
	| Success<T>
	| Failure<U>;
