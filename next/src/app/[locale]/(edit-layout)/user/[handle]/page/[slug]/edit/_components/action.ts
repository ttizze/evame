/* app/[locale]/(pages)/_actions/edit-page-content.ts */
"use server";

import { detectLocale } from "@/app/[locale]/_lib/detect-locale"; // ★ cld3 等で判定
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { upsertPageAndSegments } from "../_db/mutations.server";
export type EditPageContentActionState = ActionResponse<
	void,
	{
		slug: string;
		userLocale: string;
		title: string;
		pageContent: string;
	}
>;

const schema = z.object({
	slug: z.string().min(1),
	userLocale: z.string(),
	title: z.string().min(1).max(100),
	pageContent: z
		.string()
		.min(1)
		.transform((str) => JSON.parse(str)),
});

export async function editPageContentAction(
	_prev: EditPageContentActionState,
	formData: FormData,
): Promise<EditPageContentActionState> {
	/* 1. 認証チェック */
	const user = await getCurrentUser();
	if (!user?.id) return redirect("/auth/login");

	/* 2. バリデーション & パース */
	const parsed = await parseFormData(schema, formData);
	if (!parsed.success) {
		return { success: false, zodErrors: parsed.error.flatten().fieldErrors };
	}
	const { slug, title, pageContent, userLocale } = parsed.data;

	const sourceLocale = await detectLocale(pageContent, userLocale);

	/* 4. 本文 & セグメントをアップサート */
	await upsertPageAndSegments({
		slug,
		userId: user.id,
		title,
		contentJson: pageContent,
		sourceLocale,
	});

	/* 5. ISR / RSC キャッシュを再検証 */
	revalidatePath(`/user/${user.handle}/page/${slug}`);

	return { success: true, message: "Page updated successfully!" };
}
