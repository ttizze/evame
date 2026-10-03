import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { loadPageManagementData } from "./-page-management-data.server";

const localeSchema = z
	.string()
	.refine((locale) =>
		supportedLocaleOptions.some((option) => option.code === locale),
	);

const pageManagementInput = z.object({
	locale: localeSchema,
	handle: z.string().min(1),
	page: z.number().int().positive(),
	query: z.string(),
});
export type PageManagementInput = z.infer<typeof pageManagementInput>;

export const getPageManagementData = createServerFn({ method: "GET" })
	.validator(pageManagementInput)
	.handler(({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie, Authorization");
		return loadPageManagementData(data, new Headers(getRequestHeaders()));
	});
