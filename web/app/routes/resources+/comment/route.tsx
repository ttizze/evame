import { type ActionFunctionArgs, json } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/prisma";

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request);

	if (!currentUser) {
		return json({ error: "Login required to comment" }, { status: 401 });
	}

	const formData = await request.formData();
	const pageId = formData.get("pageId");
	const content = formData.get("content");
	const intent = formData.get("intent");
	const commentId = formData.get("commentId");

	if (!pageId || !content) {
		return json({ error: "Page ID and content are required" }, { status: 400 });
	}

	switch (intent) {
		case "create": {
			const comment = await prisma.comment.create({
				data: {
					content: content.toString(),
					pageId: Number(pageId.toString()),
					userId: Number(currentUser.id),
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

			return json({ comment });
		}

		case "delete": {
			if (!commentId) {
				return json({ error: "Comment ID is required" }, { status: 400 });
			}

			const comment = await prisma.comment.findUnique({
				where: { id: Number(commentId.toString()) },
				select: { userId: true },
			});

			if (!comment) {
				return json({ error: "Comment not found" }, { status: 404 });
			}

			// コメントの削除権限チェック
			if (comment.userId !== Number(currentUser.id)) {
				return json({ error: "Unauthorized" }, { status: 403 });
			}

			await prisma.comment.delete({
				where: { id: Number(commentId.toString()) },
			});

			return json({ success: true });
		}

		default:
			return json({ error: "Invalid intent" }, { status: 400 });
	}
}
