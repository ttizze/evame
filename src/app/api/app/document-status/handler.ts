import { z } from "zod";
import { getUserTargetLocales } from "@/app/_db/queries.server";
import { enqueueTranslationJob } from "@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server";
import { authenticateToken } from "@/app/api/_service/authenticate-token";
import { runTransaction } from "@/db/transaction";
import type { JsonValue } from "@/db/types";
import { findDocumentPage } from "../_db/queries";
import { toAppDocument } from "../_domain/app-document";
import { judgeDocumentWrite } from "../_domain/judge-document-write";

const statusInput = z.object({
	status: z.enum(["PUBLIC", "DRAFT"]),
	expected_revision: z.string(),
});

/**
 * 取得した版の文書を公開・非公開にする。公開するたびに、Webの公開と同じく保存済みの翻訳先へ翻訳を始める。
 * 翻訳の投入は外部への通信なので、状態の保存のトランザクションの後に行う。
 */
export async function putAppDocumentStatus(
	request: Request,
	slug: string,
): Promise<Response> {
	const auth = await authenticateToken(request);
	if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
	const parsed = statusInput.safeParse(await request.json().catch(() => null));
	if (!parsed.success)
		return Response.json({ error: "Validation error" }, { status: 422 });
	const { status, expected_revision } = parsed.data;

	const result = await runTransaction(async (tx) => {
		const page = await findDocumentPage(tx, slug);
		if (!page || page.userId !== auth.userId)
			return {
				conflict: { reason: page ? "slug_taken" : "missing", document: null },
			};
		const saved = {
			slug,
			title: page.title ?? "",
			mdastJson: page.mdastJson as JsonValue,
		};
		const current = toAppDocument({ ...saved, status: page.status });
		const incoming = toAppDocument({ ...saved, status });
		const judgment = judgeDocumentWrite({
			page: { owned: true, status: page.status, revision: current.revision },
			expectedRevision: expected_revision,
			incomingRevision: incoming.revision,
		});
		if (judgment.action === "conflict")
			return { conflict: { reason: judgment.reason, document: current } };
		if (judgment.action === "update")
			await tx
				.updateTable("pages")
				.set({ status })
				.where("id", "=", page.id)
				.execute();
		return { document: incoming, pageId: page.id };
	});

	if ("conflict" in result)
		return Response.json(result.conflict, { status: 409 });
	if (status === "PUBLIC")
		await enqueueTranslationJob({
			currentUserId: auth.userId,
			pageId: result.pageId,
			targetLocales: await getUserTargetLocales(auth.userId),
			aiModel: "gemini-2.5-flash-lite",
			pageCommentId: null,
			translationContext: "",
		});
	// 変更なしの再送でも、前回失敗して保留中の公開ページの無効化を済ませてから成功を返す。
	return Response.json(result.document);
}
