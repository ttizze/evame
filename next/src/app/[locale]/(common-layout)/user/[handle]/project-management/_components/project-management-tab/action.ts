"use server";

import { requireAuth } from "@/app/[locale]/_action/auth-and-validate";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
/**
 * 新規プロジェクトを下書き状態で作成し、
 * 編集画面への URL を返す。
 */

export async function createProjectDraft(formData: FormData) {
	const user = await requireAuth();

	const project = await prisma.project.create({
		data: {
			slug: nanoid(),
			userId: user.id,
			title: "",
			sourceLocale: "unknown",
			mdastJson: {},
		},
		select: { slug: true },
	});

	redirect(`/user/${user.handle}/project/${project.slug}/edit`);
}
