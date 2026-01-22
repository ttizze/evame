import type { z } from "zod";

export async function parseFormData<T extends z.ZodTypeAny>(
	schema: T,
	formData: FormData,
): Promise<z.ZodSafeParseResult<z.infer<T>>> {
	const data: Record<string, string | string[]> = {};
	for (const [key, value] of formData.entries()) {
		if (typeof value !== "string") continue;
		const existing = data[key];
		if (existing === undefined) {
			data[key] = value;
		} else if (Array.isArray(existing)) {
			existing.push(value);
		} else {
			data[key] = [existing, value];
		}
	}
	return schema.safeParse(data);
}
