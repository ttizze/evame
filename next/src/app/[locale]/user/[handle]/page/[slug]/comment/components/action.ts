"use server";
import { getLocaleFromHtml } from "@/app/[locale]/user/[handle]/page/[slug]/utils/getLocaleFromHtml";
import { createPageComment } from "../functions/mutations.server";  
import { processPageCommentHtml } from "../lib/process-page-comment-html";
import { z } from "zod";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
export const createPageCommentSchema = z.object({
	pageId: z.number(),
	content: z.string().min(1, "Comment cannot be empty"),
});

export async function commentAction(formData: FormData) {
  const session = await auth();
  const currentUser = session?.user;
  if (!currentUser || !currentUser.id) {
    return { error: "Unauthorized" };
  }
  const validate = createPageCommentSchema.safeParse({
    pageId: formData.get("pageId"),
    content: formData.get("content"),
  });
  if (!validate.success) {
    return { error: "Invalid form data" };
  }

	const locale = await getLocaleFromHtml(validate.data.content);
	const pageComment = await createPageComment(
		validate.data.content,
  locale,
  currentUser.id,
  validate.data.pageId,
);
await processPageCommentHtml(
  pageComment.id,
  validate.data.content,
  locale,
  currentUser.id,
  validate.data.pageId,
);
revalidatePath(`/user/${currentUser.handle}/page/${validate.data.pageId}`);
return { success: "Comment created successfully" };
}
