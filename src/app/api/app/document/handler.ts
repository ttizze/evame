import { z } from "zod";
import { pageTitleSchema } from "@/app/_domain/page-title";
import { contentToMdastWithSegments } from "@/app/[locale]/_service/content-to-mdast-with-segments";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { upsertPage } from "@/app/[locale]/_service/upsert-page-and-segments/db/mutations.server";
import { authenticateToken } from "@/app/api/_service/authenticate-token";
import { runTransaction } from "@/db/transaction";
import type { JsonValue } from "@/db/types";
import { findDocumentPage } from "../_db/queries";
import { toAppDocument } from "../_domain/app-document";
import { judgeDocumentWrite } from "../_domain/judge-document-write";

const slugPattern = /^[0-9a-z]{12,64}$/;
const documentInput = z.object({
	title: pageTitleSchema,
	body: z.string().max(1_000_000),
	expected_revision: z.string().nullable(),
	locale: z.string().min(1),
});

/**
 * アプリの文書を作成・更新する。版の確認と書き込みは同じトランザクションで行い、公開状態は変えない。
 * 外部への通信を含む変換（画像の取り込み・言語の判定）はトランザクションの前に済ませる。
 */
export async function putAppDocument(
	request: Request,
	slug: string,
): Promise<Response> {
	const auth = await authenticateToken(request);
	if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
	if (!slug || slug.length > 200)
		return Response.json({ error: "Invalid slug" }, { status: 422 });
	const parsed = documentInput.safeParse(
		await request.json().catch(() => null),
	);
	if (!parsed.success)
		return Response.json({ error: "Validation error" }, { status: 422 });
	const { title, body, expected_revision, locale } = parsed.data;

	const converted = await contentToMdastWithSegments({
		content: body,
		contentFormat: "markdown",
		header: title,
		userLocale: locale,
	});
	const result = await runTransaction(async (tx) => {
		const page = await findDocumentPage(tx, slug);
		if (!page && !slugPattern.test(slug)) return null;
		const owned = page?.userId === auth.userId;
		const current =
			page && owned
				? toAppDocument({
						slug,
						title: page.title ?? "",
						mdastJson: page.mdastJson as JsonValue,
						status: page.status,
					})
				: null;
		const incoming = toAppDocument({
			slug,
			title,
			mdastJson: converted.mdastJson,
			status: page?.status ?? "DRAFT",
		});
		const judgment = judgeDocumentWrite({
			page: page
				? { owned, status: page.status, revision: current?.revision ?? "" }
				: null,
			expectedRevision: expected_revision,
			incomingRevision: incoming.revision,
		});
		if (judgment.action === "conflict") return { judgment, document: current };
		if (judgment.action === "unchanged")
			return { judgment, document: current ?? incoming };

		const saved = await upsertPage(tx, {
			pageSlug: slug,
			userId: auth.userId,
			mdastJson: converted.mdastJson,
			sourceLocale: converted.sourceLocale,
			parentId: null,
			order: null,
			// 新しい文書は下書きで作り、既存の文書の公開状態は変えない。
			status: page ? null : "DRAFT",
		});
		await syncSegments(tx, saved.id, converted.segments);
		return { judgment, document: incoming };
	});

	if (!result) return Response.json({ error: "Invalid slug" }, { status: 422 });
	if (result.judgment.action === "conflict")
		return Response.json(
			{ reason: result.judgment.reason, document: result.document },
			{ status: 409 },
		);
	const response = Response.json(result.document, {
		status: result.judgment.action === "create" ? 201 : 200,
	});
	// 下書きは公開ページに出ないため無効化しない。公開中の文書は変更なしの再送でも、
	// 前回失敗して保留中の無効化を済ませてから成功を返す。
	if (result.document?.status !== "PUBLIC")
		response.headers.set("X-Evame-Reader-Changed", "false");
	return response;
}
