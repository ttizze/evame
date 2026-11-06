import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { loadHomePage } from "./service/load-home-page";

export const getHomeFeed = createServerFn({ method: "GET" })
	.validator(
		z
			.string()
			.refine((locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			),
	)
	.handler(({ data: locale }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		return loadHomePage(locale);
	});
