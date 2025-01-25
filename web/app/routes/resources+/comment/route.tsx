import { parseWithZod } from "@conform-to/zod";
import { type ActionFunctionArgs, data } from "@remix-run/node";
import { z } from "zod";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/prisma";

export const createPageCommentSchema = z.object({
	pageId: z.number(),
	text: z.string().min(1, "Comment cannot be empty"),
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
			const pageComment = await prisma.pageComment.create({
				data: {
					text: submission.value.text,
					pageId: submission.value.pageId,
					userId: currentUser.id,
				},
				include: {
					user: {
						select: {
							handle: true,
							name: true,
							image: true,
						},
					},
				},
			});

			return data({
				pageComment,
				lastResult: submission.reply({ resetForm: true }),
			});
		}

		case "delete": {
			if (!submission.value.pageCommentId) {
				return data({ lastResult: submission.reply() });
			}

			const pageComment = await prisma.pageComment.findUnique({
				where: { id: submission.value.pageCommentId },
				select: { userId: true },
			});

			if (!pageComment || pageComment.userId !== currentUser.id) {
				return data({ lastResult: submission.reply() });
			}

			await prisma.pageComment.delete({
				where: { id: submission.value.pageCommentId },
			});

			return data({ lastResult: submission.reply({ resetForm: true }) });
		}

		default:
			return data({ lastResult: submission.reply() });
	}
}
