import type { z } from 'zod';
export function parseFormData<
  S extends z.ZodType<unknown, z.ZodTypeDef, unknown>,
>(
  schema: S,
  formData: FormData
): z.SafeParseReturnType<z.input<S>, z.infer<S>> {
  const data = Object.fromEntries(formData.entries());
  return schema.safeParse(data);
}
