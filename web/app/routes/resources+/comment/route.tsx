import { parseWithZod } from "@conform-to/zod";
import { type ActionFunctionArgs, data } from "@remix-run/node";
import { z } from "zod";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/prisma";

export const createCommentSchema = z.object({
	pageId: z.number(),
	text: z.string().min(1, "Comment cannot be empty"),
	intent: z.literal("create"),
});

export const deleteCommentSchema = z.object({
	commentId: z.number(),
	intent: z.literal("delete"),
});

export const schema = z.discriminatedUnion("intent", [
	createCommentSchema,
	deleteCommentSchema,
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
			const comment = await prisma.comment.create({
				data: {
					text: submission.value.text,
					pageId: submission.value.pageId,
					userId: currentUser.id,
				},
				include: {
					user: {
						select: {
							userName: true,
							displayName: true,
							icon: true,
						},
					},
				},
			});

			return data({
				comment,
				lastResult: submission.reply({ resetForm: true }),
			});
		}

		case "delete": {
			if (!submission.value.commentId) {
				return data({ lastResult: submission.reply() });
			}

			const comment = await prisma.comment.findUnique({
				where: { id: submission.value.commentId },
				select: { userId: true },
			});

			if (!comment || comment.userId !== currentUser.id) {
				return data({ lastResult: submission.reply() });
			}

			await prisma.comment.delete({
				where: { id: submission.value.commentId },
			});

			return data({ lastResult: submission.reply({ resetForm: true }) });
		}

		default:
			return data({ lastResult: submission.reply() });
	}
}
