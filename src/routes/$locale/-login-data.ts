import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";

const locales = supportedLocaleOptions.map((option) => option.code);
const loginInput = z.object({
	locale: z.string().refine((locale) => locales.includes(locale)),
	next: z.string().optional(),
});

function resolveNextPath(next: string | undefined) {
	if (!next || !next.startsWith("/") || next.startsWith("//")) {
		return "/";
	}
	return next;
}

export const getLoginData = createServerFn({ method: "GET" })
	.validator(loginInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const { getCurrentUserFromHeaders } = await import(
			"@/app/_service/current-user"
		);
		if (await getCurrentUserFromHeaders(new Headers(getRequestHeaders()))) {
			throw redirect({ href: resolveNextPath(data.next) });
		}
	});
