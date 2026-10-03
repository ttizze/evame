import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import type { ActionResponse } from "@/app/types";
import { upsertTags } from "./_db/mutations.server";

const editPageTagsSchema = z.object({
	pageId: z.coerce.number().min(1),
	tags: z.preprocess(
		(value) => {
			try {
				return JSON.parse(value as string);
			} catch {
				return [];
			}
		},
		z
			.array(
				z
					.string()
					.regex(
						/^[^\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+$/,
						"symbol and space can not be used",
					)
					.min(1, "tag can be min 1")
					.max(15, "tag can max 15 characters"),
			)
			.max(5, "tags can be max 5"),
	),
});

export type EditPageTagsActionState = ActionResponse<
	undefined,
	{ pageId: number; tags: string[] }
>;

const formDataValidator = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}
	return value;
};

export const editPageTags = createServerFn({ method: "POST" })
	.validator(formDataValidator)
	.handler(async ({ data: formData }): Promise<EditPageTagsActionState> => {
		const parsed = editPageTagsSchema.safeParse({
			pageId: formData.get("pageId"),
			tags: formData.get("tags"),
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

		await upsertTags(parsed.data.tags, parsed.data.pageId);
		return { success: true, data: undefined };
	});
