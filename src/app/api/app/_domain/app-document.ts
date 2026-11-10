import { createHash } from "node:crypto";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import type { JsonValue, PageStatus } from "@/db/types";

/**
 * アプリの文書の版。題名・本文・公開状態のどれかが変われば変わり、同じ内容なら同じ値になる。
 * Webでの公開・非公開も検知できるよう、CLIの版と違って公開状態を含める。
 */
export function computeDocumentRevision(document: {
	slug: string;
	title: string;
	body: string;
	status: PageStatus;
}) {
	return createHash("sha256")
		.update(
			JSON.stringify([
				document.slug,
				document.title,
				document.body,
				document.status,
			]),
		)
		.digest("hex");
}

/** 保存済みのページを、アプリとやり取りする文書（Markdown本文と版）にする。 */
export function toAppDocument(page: {
	slug: string;
	title: string;
	mdastJson: JsonValue;
	status: PageStatus;
}) {
	const document = {
		slug: page.slug,
		title: page.title,
		body: mdastToMarkdown(page.mdastJson),
		status: page.status,
	};
	return { ...document, revision: computeDocumentRevision(document) };
}
