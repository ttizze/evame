import { upsertPageWithHtml } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[slug]/edit/_db/mutations.server";
import { rehypeAddDataId } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[slug]/edit/_lib/process-page-html";
import type { PageStatus } from "@prisma/client";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
export async function processMarkdownContent(
	title: string,
	body: string,
	pageSlug: string,
	userId: string,
	sourceLocale: string,
	status: PageStatus,
) {
	const page = await upsertPageWithHtml(pageSlug, body, userId, sourceLocale);

	const file = await remark()
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeAddDataId(page.id, title))
		.use(rehypeRaw)
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(body);

	const htmlContent = String(file);

	await upsertPageWithHtml(pageSlug, htmlContent, userId, sourceLocale);
	return page;
}
