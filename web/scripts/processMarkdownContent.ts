import type { PageStatus } from "@prisma/client";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { upsertPageWithHtml } from "~/routes/$locale+/user.$handle+/page+/$slug+/edit/functions/mutations.server";
import { rehypeAddDataId } from "~/routes/$locale+/user.$handle+/page+/$slug+/edit/utils/processHtmlContent";
export async function processMarkdownContent(
	title: string,
	body: string,
	pageSlug: string,
	userId: number,
	sourceLanguage: string,
	status: PageStatus,
) {
	const page = await upsertPageWithHtml(
		pageSlug,
		body,
		userId,
		sourceLanguage,
		status,
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
		status,
	);
	return page;
}
