import type { User } from "@prisma/client";
import type { typeToFlattenedError } from "zod";
import type * as z from "zod";
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

type ValidatedActionFunction<
	S extends z.ZodType<unknown, z.ZodTypeDef, unknown>,
	T,
> = (data: z.infer<S>, formData: FormData) => Promise<T>;

export function validatedAction<
	S extends z.ZodType<unknown, z.ZodTypeDef, unknown>,
	T,
>(schema: S, action: ValidatedActionFunction<S, T>) {
	return async (
		prevState: ActionResponse,
		formData: FormData,
	): Promise<T | ActionResponse> => {
		const result = schema.safeParse(Object.fromEntries(formData));
		if (!result.success) {
			return { success: false, message: result.error.errors[0].message };
		}
		return action(result.data, formData);
	};
}
