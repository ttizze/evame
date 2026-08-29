import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";

const locales = supportedLocaleOptions.map((option) => option.code);
const loginInput = z.object({
	locale: z.string().refine((locale) => locales.includes(locale)),
	next: z.string().optional(),
});

export const getLoginData = createServerFn({ method: "GET" })
	.validator(loginInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		if (await getCurrentUserFromHeaders(new Headers(getRequestHeaders()))) {
			throw redirect({
				href:
					data.next?.startsWith("/") &&
					!data.next.startsWith("//") &&
					!data.next.includes("\\") &&
					!/%(?:0a|0d|2f|5c)/iu.test(data.next)
						? data.next
						: "/",
			});
		}
	});
