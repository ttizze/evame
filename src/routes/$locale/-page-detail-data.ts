import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { queryPageDetail } from "@/app/[locale]/_db/queries";
import { loadPageContentData } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data";

const pageDetailInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	handle: z.string().min(1),
	pageSlug: z.string().min(1),
});

export const getPageDetailData = createServerFn({ method: "GET" })
	.validator(pageDetailInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie, Authorization");

		const pageDetail = await queryPageDetail(data.pageSlug, data.locale);
		if (!pageDetail || pageDetail.userHandle !== data.handle) return null;

		if (pageDetail.status !== "PUBLIC") {
			const currentUser = await getCurrentUserFromHeaders(
				new Headers(getRequestHeaders()),
			);
			if (!currentUser || currentUser.handle !== pageDetail.userHandle) {
				return null;
			}
		}

		if (!pageDetail.segments.some((segment) => segment.number === 0)) {
			return null;
		}

		return loadPageContentData(pageDetail, data.locale);
	});
