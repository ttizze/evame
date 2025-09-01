import { revalidatePath } from "next/cache";
import { supportedLocaleOptions } from "@/app/_constants/locale";

export function revalidateAllLocales(basePath: string) {
	// Default-locale path (no prefix in as-needed strategy)
	revalidatePath(basePath);
	// Locale-prefixed paths
	for (const { code } of supportedLocaleOptions) {
		revalidatePath(`/${code}${basePath}`);
	}
}
