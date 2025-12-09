import type { DB } from "kysely-codegen";
import type { ZodFlattenedError } from "zod";

export type SanitizedUser = Omit<
	DB["users"],
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
