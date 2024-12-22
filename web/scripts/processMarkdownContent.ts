import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import {
	upsertPageWithHtml,
	upsertTitle,
} from "~/routes/$locale+/$userName+/page+/$slug+/edit/functions/mutations.server";
import { rehypeAddDataId } from "~/routes/$locale+/$userName+/page+/$slug+/edit/utils/processHtmlContent";

export async function processMarkdownContent(
	title: string,
	body: string,
	pageSlug: string,
	userId: number,
	sourceLanguage: string,
	isPublished: boolean,
) {
	const page = await upsertPageWithHtml(
		pageSlug,
		body,
		userId,
		sourceLanguage,
		isPublished,
	);

	const file = await remark()
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeAddDataId(page.id, title))
		.use(rehypeRaw)
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(body);

	const htmlContent = String(file);

	await upsertPageWithHtml(
		pageSlug,
		htmlContent,
		userId,
		sourceLanguage,
		isPublished,
	);
	await upsertTitle(pageSlug, title);
	return page;
}
