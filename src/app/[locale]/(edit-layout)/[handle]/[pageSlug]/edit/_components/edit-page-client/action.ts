import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import type { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { createServerLogger } from "@/app/_service/logger.server";
import { getPageWithTitleAndTagsBySlug } from "@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_db/queries.server";
import type { ActionResponse } from "@/app/types";
import { formSchema } from "./_domain/form-schema";
import { processPageContent } from "./service/process-page-content";

export type EditPageContentActionState = ActionResponse<
	{ pageId: number },
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
		contentFormat: formData.get("contentFormat") ?? undefined,
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

		const { pageSlug, userLocale, title, pageContent, contentFormat } =
			parsed.data;
		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser?.id) {
			throw redirect({ href: `/${userLocale}/auth/login` });
		}

		const existingPage = await getPageWithTitleAndTagsBySlug(pageSlug);
		if (existingPage && existingPage.userId !== currentUser.id) {
			throw redirect({ href: `/${userLocale}/auth/login` });
		}

		const logger = createServerLogger("edit-page-content", {
			userId: currentUser.id,
			pageSlug,
			userLocale,
		});
		try {
			const page = await processPageContent({
				title,
				content: pageContent,
				contentFormat,
				pageSlug,
				userId: currentUser.id,
				userLocale,
				parentId: existingPage?.parentId ?? null,
				order: existingPage?.order ?? 0,
				status: existingPage?.status ?? "DRAFT",
			});
			if (existingPage?.status !== "PUBLIC")
				setResponseHeader("X-Evame-Reader-Changed", "false");
			return { success: true, data: { pageId: page.id } };
		} catch (error) {
			logger.error({ err: error }, "Failed to save page");
			return { success: false, message: "Failed to save page" };
		}
	});
