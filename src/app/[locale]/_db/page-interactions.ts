import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSessionUser, requireSessionUser } from "@/auth/session";
import {
	readPageInteractionState,
	togglePageLike as savePageLike,
	incrementPageView as savePageView,
} from "@/server/page-interactions";
import { getDatabase } from "@/server/runtime";

const pageIdInput = z.object({
	pageId: z.number().int().positive(),
});

export const getPageInteractionState = createServerFn({ method: "GET" })
	.validator(pageIdInput)
	.handler(async ({ data }) => {
		const user = await getSessionUser(getRequest());
		return readPageInteractionState(getDatabase(), {
			pageId: data.pageId,
			viewerUserId: user?.id ?? null,
		});
	});

export const incrementPageView = createServerFn({ method: "POST" })
	.validator(pageIdInput)
	.handler(({ data }) => savePageView(getDatabase(), data.pageId));

export const togglePageLike = createServerFn({ method: "POST" })
	.validator(pageIdInput)
	.handler(async ({ data }) => {
		const user = await requireSessionUser(getRequest());
		return savePageLike(getDatabase(), {
			pageId: data.pageId,
			userId: user.id,
		});
	});
