import { isRedirect } from "@tanstack/react-router";
import { ZodError } from "zod";
import { isSameOriginRequest } from "@/app/api/_utils/is-same-origin-request";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { commentAction } from "@/app/api/reader-actions/_service/add-comment";
import { deletePageCommentAction } from "@/app/api/reader-actions/_service/delete-comment";
import { followAction } from "@/app/api/reader-actions/_service/follow-user";
import { togglePageLikeAction } from "@/app/api/reader-actions/_service/toggle-like";
import { executeTranslateAction } from "@/app/api/reader-actions/_service/translate-page";
import { updateGeminiApiKeyAction } from "@/app/api/reader-actions/_service/update-gemini-key";
import { updatePageComments } from "@/app/api/reader-actions/_service/update-page-comments";
import { uploadEditorImage } from "@/app/api/reader-actions/_service/upload-image";

export type ReaderActions = {
	like: typeof togglePageLikeAction;
	comment: typeof commentAction;
	deleteComment: typeof deletePageCommentAction;
	translate: typeof executeTranslateAction;
	geminiKey: typeof updateGeminiApiKeyAction;
	follow: typeof followAction;
	uploadImage: typeof uploadEditorImage;
	pageComments: typeof updatePageComments;
};

const handlers = {
	like: async (request) =>
		togglePageLikeAction(await request.json(), request.headers),
	comment: async (request) =>
		commentAction(await request.json(), request.headers),
	deleteComment: async (request) =>
		deletePageCommentAction(await request.json(), request.headers),
	translate: async (request) =>
		executeTranslateAction(await request.formData()),
	geminiKey: async (request) =>
		updateGeminiApiKeyAction(await request.json(), request.headers),
	follow: async (request) =>
		followAction(await request.json(), request.headers),
	uploadImage: async (request) =>
		uploadEditorImage(await request.formData(), request.headers),
	pageComments: async (request) =>
		updatePageComments(await request.json(), request.headers),
} satisfies Record<keyof ReaderActions, (request: Request) => Promise<unknown>>;

export async function postReaderAction(request: Request) {
	const headers = PRIVATE_RESPONSE_HEADERS;
	if (!isSameOriginRequest(request))
		return Response.json({ success: false }, { status: 403, headers });
	const action = new URL(request.url).searchParams.get("action");
	if (!action || !Object.hasOwn(handlers, action))
		return Response.json({ success: false }, { status: 404, headers });
	try {
		const result = await handlers[action as keyof ReaderActions](request);
		return Response.json(result, {
			headers: result.success
				? headers
				: { ...headers, "X-Evame-Reader-Changed": "false" },
		});
	} catch (error) {
		if (error instanceof Response && error.status === 401)
			return Response.json({ success: false }, { status: 401, headers });
		if (isRedirect(error))
			return Response.json({ success: false }, { status: 401, headers });
		if (error instanceof ZodError || error instanceof SyntaxError)
			return Response.json(
				{ success: false, message: "Invalid input" },
				{ status: 400, headers },
			);
		throw error;
	}
}
