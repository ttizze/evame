import type { z } from 'zod';
export async function parseFormData<
  S extends z.ZodType<unknown, z.ZodTypeDef, unknown>,
>(
  schema: S,
  formData: FormData
): Promise<z.SafeParseReturnType<z.input<S>, z.infer<S>>> {
  const data = Object.fromEntries(formData.entries());
  return schema.safeParse(data);
}
