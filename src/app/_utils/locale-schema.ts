import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";

export const localeSchema = z
	.string()
	.refine((locale) =>
		supportedLocaleOptions.some((option) => option.code === locale),
	);
