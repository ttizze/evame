import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { mdastToHtml } from "@/app/[locale]/_domain/mdast-to-html";
import {
	getAllTagsWithCount,
	getPageWithTitleAndTagsBySlug,
	getTranslationContextsByUserId,
	getUserTargetLocales,
} from "@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_db/queries.server";

const pageEditInput = z.object({
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

export const getPageEditData = createServerFn({ method: "GET" })
	.validator(pageEditInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser || currentUser.handle !== data.handle) {
			throw redirect({ href: `/${data.locale}/auth/login` });
		}

		const pageWithTitleAndTags = await getPageWithTitleAndTagsBySlug(
			data.pageSlug,
		);
		if (
			!pageWithTitleAndTags ||
			pageWithTitleAndTags.userId !== currentUser.id
		) {
			return null;
		}

		const [allTagsWithCount, targetLocales, translationContexts] =
			await Promise.all([
				getAllTagsWithCount(),
				getUserTargetLocales(currentUser.id),
				getTranslationContextsByUserId(currentUser.id),
			]);
		const { html } = await mdastToHtml({
			mdastJson: pageWithTitleAndTags.mdastJson ?? null,
		});

		return {
			allTagsWithCount,
			currentUser,
			html,
			initialTitle: pageWithTitleAndTags.segments[0]?.text,
			pageSlug: data.pageSlug,
			pageWithTitleAndTags,
			targetLocales,
			translationContexts,
			userLocale: data.locale,
		};
	});
