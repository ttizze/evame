import type { ZodFlattenedError } from "zod";
import type { User } from "@/drizzle/types";

export type SanitizedUser = Omit<
	User,
	"email" | "provider" | "emailVerified" | "id"
>;

type Failure<U = Record<string, unknown>> = {
	success: false;
	message?: string;
	zodErrors?: ZodFlattenedError<U>["fieldErrors"];
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
