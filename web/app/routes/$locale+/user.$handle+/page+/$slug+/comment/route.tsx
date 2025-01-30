import { parseWithZod } from "@conform-to/zod";
import { type ActionFunctionArgs, data } from "@remix-run/node";
import { z } from "zod";
import { getLocaleFromHtml } from "~/routes/$locale+/user.$handle+/page+/$slug+/utils/getLocaleFromHtml";
import { authenticator } from "~/utils/auth.server";
import {
	createPageComment,
	deletePageComment,
} from "./functions/mutations.server";
import { getPageComment } from "./functions/queries.server";
import { processPageCommentHtml } from "./lib/process-page-comment-html";

export const createPageCommentSchema = z.object({
	pageId: z.number(),
	content: z.string().min(1, "Comment cannot be empty"),
	intent: z.literal("create"),
});

export const deletePageCommentSchema = z.object({
	pageCommentId: z.number(),
	intent: z.literal("delete"),
});

export const schema = z.discriminatedUnion("intent", [
	createPageCommentSchema,
	deletePageCommentSchema,
]);

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request);

	const submission = parseWithZod(await request.formData(), {
		schema,
	});
	if (!currentUser) {
		return data({
			lastResult: submission.reply({ formErrors: ["Unauthorized"] }),
		});
	}
	if (submission.status !== "success") {
		return data({ lastResult: submission.reply() });
	}
	switch (submission.value.intent) {
		case "create": {
			const locale = await getLocaleFromHtml(submission.value.content);
			const pageComment = await createPageComment(
				submission.value.content,
				locale,
				currentUser.id,
				submission.value.pageId,
			);
			await processPageCommentHtml(
				pageComment.id,
				submission.value.content,
				locale,
				currentUser.id,
				submission.value.pageId,
			);

			return data({
				pageComment,
				lastResult: submission.reply({ resetForm: true }),
			});
		}

		case "delete": {
			if (!submission.value.pageCommentId) {
				return data({ lastResult: submission.reply() });
			}

			const pageComment = await getPageComment(submission.value.pageCommentId);

			if (!pageComment || pageComment.userId !== currentUser.id) {
				return data({ lastResult: submission.reply() });
			}

			await deletePageComment(submission.value.pageCommentId);

			return data({ lastResult: submission.reply({ resetForm: true }) });
		}

		default:
			return data({ lastResult: submission.reply() });
	}
}
