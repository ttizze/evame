import { annotateHtmlWithSegments } from "@/app/[locale]/_lib/annotate-html-with-segments";
import { upsertProjectAndSegments } from "../../_db/mutations.server";

//titleはprojectsのtitleで翻訳はしない taglineは翻訳が必要で､header
export async function processProjectHtml(p: {
	title: string;
	description: string;
	tagLine: string;
	projectId: string | undefined;
	userId: string;
	sourceLocale: string;
}) {
	const { title, description, tagLine, projectId, userId, sourceLocale } = p;
	const { annotatedHtml, segments } = await annotateHtmlWithSegments({
		header: tagLine,
		html: description,
	});
	const updatedProject = await upsertProjectAndSegments({
		projectId,
		userId,
		title,
		tagLine,
		description: annotatedHtml,
		sourceLocale,
		segments,
	});
	return updatedProject;
}
