import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { createServerLogger } from "@/app/_service/logger.server";
import { getLocaleFromHtml } from "@/app/[locale]/_domain/get-locale-from-html";
import { getPageWithTitleAndTagsBySlug } from "@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_db/queries.server";
import type { ActionResponse } from "@/app/types";
import { processPageHtml } from "./service/process-page-html";

const formSchema = z.object({
	pageSlug: z.string().min(1),
	userLocale: z.string().min(1),
	title: z
		.string()
		.transform((value) => value.replace(/\r\n|\r|\n/g, " ").trim())
		.pipe(z.string().min(1).max(100)),
	pageContent: z.string().min(1),
});

export type EditPageContentActionState = ActionResponse<
	undefined,
	z.input<typeof formSchema>
>;

const formDataValidator = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}
	return value;
};

function parseFormData(formData: FormData) {
	return formSchema.safeParse({
		pageSlug: formData.get("pageSlug"),
		userLocale: formData.get("userLocale"),
		title: formData.get("title"),
		pageContent: formData.get("pageContent"),
	});
}

export const editPageContent = createServerFn({ method: "POST" })
	.validator(formDataValidator)
	.handler(async ({ data: formData }): Promise<EditPageContentActionState> => {
		const parsed = parseFormData(formData);
		if (!parsed.success) {
			return {
				success: false,
				zodErrors: parsed.error.flatten().fieldErrors,
			};
		}

		const { pageSlug, userLocale, title, pageContent } = parsed.data;
		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser?.id) {
			throw redirect({ href: `/${userLocale}/auth/login` });
		}

		const existingPage = await getPageWithTitleAndTagsBySlug(pageSlug);
		if (!existingPage || existingPage.userId !== currentUser.id) {
			throw redirect({ href: `/${userLocale}/auth/login` });
		}

		const logger = createServerLogger("edit-page-content", {
			userId: currentUser.id,
			pageSlug,
			userLocale,
		});
		try {
			const sourceLocale = await getLocaleFromHtml(pageContent, userLocale);
			await processPageHtml({
				title,
				html: pageContent,
				pageSlug,
				userId: currentUser.id,
				sourceLocale,
				segmentTypeId: null,
				parentId: existingPage.parentId ?? null,
				order: existingPage.order ?? 0,
				anchorContentId: null,
				status: existingPage.status ?? "DRAFT",
			});
			return { success: true, data: undefined };
		} catch (error) {
			logger.error({ err: error }, "Failed to save page");
			return { success: false, message: "Failed to save page" };
		}
	});
