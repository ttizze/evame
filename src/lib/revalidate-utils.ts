import { revalidatePath } from "next/cache";
import { supportedLocaleOptions } from "@/app/_constants/locale";

export function revalidateAllLocales(
	basePath: string,
	revalidateFn: (path: string) => void = revalidatePath,
) {
	// Default-locale path (no prefix in as-needed strategy)
	revalidateFn(basePath);
	// Locale-prefixed paths
	for (const { code } of supportedLocaleOptions) {
		revalidateFn(`/${code}${basePath}`);
	}
}
