import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { fetchProfilePage } from "@/app/[locale]/(common-layout)/[handle]/_service/profile";

const locales = supportedLocaleOptions.map((option) => option.code);
const localeSchema = z.string().refine((locale) => locales.includes(locale));

const handleDataInput = z.object({
	handle: z.string().min(1),
	locale: localeSchema,
	page: z.number().int().positive(),
	sort: z.enum(["popular", "new"]),
});

async function getCurrentUser() {
	return getCurrentUserFromHeaders(new Headers(getRequestHeaders()));
}

export const getHandleData = createServerFn({ method: "GET" })
	.validator(handleDataInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUser();

		return fetchProfilePage({
			currentUser: currentUser
				? { handle: currentUser.handle, id: currentUser.id }
				: null,
			handle: data.handle,
			locale: data.locale,
			page: data.page,
			sort: data.sort,
		});
	});
