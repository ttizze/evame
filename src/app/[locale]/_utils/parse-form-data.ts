import type { z } from "zod";

export async function parseFormData<T extends z.ZodTypeAny>(
	schema: T,
	formData: FormData,
): Promise<z.ZodSafeParseResult<z.infer<T>>> {
	const data = Object.fromEntries(formData.entries());
	return schema.safeParse(data);
}
