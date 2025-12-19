/**
 * 翻訳ジョブのオーケストレーター
 *
 * ファンアウトパターンを採用:
 * 呼び出し元 → QStash → /api/translate (このファイル)
 *                           ↓
 *                     QStash → /api/translate/chunk ×N (並列)
 *
 * この設計により以下を実現:
 * - 並列処理: 複数チャンクを同時に翻訳
 * - 部分失敗の分離: 失敗したチャンクのみリトライ
 * - タイムアウト回避: 各ワーカーが独立して時間を使用
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { BASE_URL } from "@/app/_constants/base-url";
import type { TranslateChunkParams } from "@/app/api/translate/types";
import { revalidatePageForLocale } from "@/lib/revalidate-utils";
import { markJobCompleted, markJobInProgress } from "./_db/mutations.server";
import {
	getAnnotationSegments,
	getPageCommentSegments,
	getPageSegments,
	getPageTitle,
} from "./_db/queries.server";
import { splitSegments } from "./_domain/split-segments";
import { withQstashVerification } from "./_utils/with-qstash-signature";

const ParamsSchema = z.object({
	userId: z.string().min(1),
	pageId: z.number().int().positive(),
	translationJobId: z.number().int().positive(),
	aiModel: z.string().min(1),
	targetLocale: z.string().min(1),
	pageCommentId: z.number().int().positive().nullable(),
	annotationContentId: z.number().int().positive().nullable(),
});

async function handler(req: Request) {
	try {
		const params = ParamsSchema.parse(await req.json());

		// pageCommentId / annotationContentId に応じてセグメントを取得
		const segments = params.annotationContentId
			? await getAnnotationSegments(params.annotationContentId)
			: params.pageCommentId
				? await getPageCommentSegments(params.pageCommentId)
				: await getPageSegments(params.pageId);

		// ページタイトルを取得（翻訳プロンプト用）
		const title = (await getPageTitle(params.pageId)) ?? "";

		const sortedSegments = [...segments].sort((a, b) => a.number - b.number);
		const chunks = splitSegments(sortedSegments, params.aiModel);
		const totalChunks = chunks.length;

		// If there is nothing to translate, finalize immediately.
		if (totalChunks === 0) {
			await markJobCompleted(params.translationJobId);
			await revalidatePageForLocale(params.pageId, params.targetLocale);
			return NextResponse.json({ ok: true }, { status: 201 });
		}

		// Mark job started only when there is work to do
		await markJobInProgress(params.translationJobId);

		// Publish each chunk as an individual QStash message to /api/translate/chunk
		const { Client } = await import("@upstash/qstash");
		const client = new Client({ token: process.env.QSTASH_TOKEN });
		const publishBaseUrl =
			process.env.QSTASH_PUBLISH_BASE_URL?.trim() || BASE_URL;

		await Promise.all(
			chunks.map((chunk, idx) => {
				const body: TranslateChunkParams = {
					translationJobId: params.translationJobId,
					aiModel: params.aiModel,
					userId: params.userId,
					targetLocale: params.targetLocale,
					pageId: params.pageId,
					pageCommentId: params.pageCommentId,
					annotationContentId: params.annotationContentId,
					segments: chunk,
					title,
					totalChunks,
					chunkIndex: idx,
				};
				return client.publishJSON({
					url: `${publishBaseUrl}/api/translate/chunk`,
					body,
					deduplicationId: `translate-${params.translationJobId}-c${idx}`,
					retries: 3,
					retryDelay: "10000",
					timeout: 240,
				});
			}),
		);

		return NextResponse.json({ ok: true }, { status: 201 });
	} catch (error) {
		console.error("/api/translate error:", error);
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}

export const POST = withQstashVerification(handler);
