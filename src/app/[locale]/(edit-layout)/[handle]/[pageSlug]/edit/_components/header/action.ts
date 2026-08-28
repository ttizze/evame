import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { enqueueTranslationJob } from "@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server";
import type { ActionResponse } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import { db } from "@/db";
import type { PageStatus } from "@/db/types";
import { updatePageStatus } from "./db/mutations.server";

const editPageStatusSchema = z.object({
	pageId: z.coerce.number().min(1),
	status: z.enum(["DRAFT", "PUBLIC", "ARCHIVE"]),
	targetLocales: z.string().transform((value) =>
		value
			.split(",")
			.map((locale) => locale.trim())
			.filter(Boolean),
	),
	translationContextId: z.preprocess(
		(value) => (value === "" || value === null ? undefined : value),
		z.coerce.number().min(1).optional(),
	),
});

export type EditPageStatusActionState = ActionResponse<
	{ translationJobs: TranslationJobForToast[] } | undefined,
	{
		pageId: number;
		status: string;
		targetLocales: string;
		translationContextId?: string;
	}
>;

const formDataValidator = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}
	return value;
};

export const editPageStatus = createServerFn({ method: "POST" })
	.validator(formDataValidator)
	.handler(async ({ data: formData }): Promise<EditPageStatusActionState> => {
		const parsed = editPageStatusSchema.safeParse({
			pageId: formData.get("pageId"),
			status: formData.get("status"),
			targetLocales: formData.get("targetLocales") ?? "",
			translationContextId: formData.get("translationContextId"),
		});
		if (!parsed.success) {
			return {
				success: false,
				zodErrors: parsed.error.flatten().fieldErrors,
			};
		}

		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser?.id) {
			throw redirect({ href: "/auth/login" });
		}

		const page = await getPageById(parsed.data.pageId);
		if (!page || page.user.id !== currentUser.id) {
			throw redirect({ href: "/auth/login" });
		}

		await updatePageStatus(
			parsed.data.pageId,
			parsed.data.status as PageStatus,
		);
		if (parsed.data.status !== "PUBLIC") {
			return { success: true, data: undefined };
		}

		let translationContext = "";
		if (parsed.data.translationContextId) {
			const context = await db
				.selectFrom("translationContexts")
				.select("context")
				.where("id", "=", parsed.data.translationContextId)
				.where("userId", "=", currentUser.id)
				.executeTakeFirst();
			translationContext = context?.context ?? "";
		}

		const translationJobs = await enqueueTranslationJob({
			currentUserId: currentUser.id,
			pageId: parsed.data.pageId,
			targetLocales:
				parsed.data.targetLocales.length > 0
					? parsed.data.targetLocales
					: ["en", "zh"],
			aiModel: "gemini-2.5-flash-lite",
			pageCommentId: null,
			annotationContentId: null,
			translationContext,
		});
		return {
			success: true,
			data: translationJobs.length ? { translationJobs } : undefined,
		};
	});
