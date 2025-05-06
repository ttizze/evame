import { htmlToMdastWithSegments } from "@/app/[locale]/_lib/html-to-mdast-with-segments";
import type { Prisma } from "@prisma/client";
import { upsertProjectAndSegments } from "../../_db/mutations.server";
//titleはprojectsのtitleで翻訳はしない taglineは翻訳が必要で､header
export async function processProjectHtml(p: {
	slug: string;
	title: string;
	description: string;
	tagLine: string;
	projectId: number | undefined;
	userId: string;
	sourceLocale: string;
	status: string;
	progress: string;
}) {
	const {
		title,
		description,
		tagLine,
		projectId,
		userId,
		sourceLocale,
		slug,
		status,
		progress,
	} = p;
	const { mdastJson, segments } = await htmlToMdastWithSegments({
		header: tagLine,
		html: description,
	});
	const updatedProject = await upsertProjectAndSegments({
		projectId,
		userId,
		slug,
		title,
		tagLine,
		mdastJson: mdastJson as unknown as Prisma.InputJsonValue,
		sourceLocale,
		segments,
		status,
		progress,
	});
	return updatedProject;
}
