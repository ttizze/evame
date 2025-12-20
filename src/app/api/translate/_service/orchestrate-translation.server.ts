/**
 * 翻訳ジョブのオーケストレーション
 *
 * ファンアウトパターンを採用:
 * 呼び出し元 → QStash → /api/translate
 *                           ↓
 *                     QStash → /api/translate/chunk ×N (並列)
 *
 * この設計により以下を実現:
 * - 並列処理: 複数チャンクを同時に翻訳
 * - 部分失敗の分離: 失敗したチャンクのみリトライ
 * - タイムアウト回避: 各ワーカーが独立して時間を使用
 */

import { Client } from "@upstash/qstash";
import { BASE_URL } from "@/app/_constants/base-url";
import { createServerLogger } from "@/lib/logger.server";
import { markJobCompleted, markJobInProgress } from "../_db/mutations.server";
import {
	getAnnotationSegments,
	getPageCommentSegments,
	getPageSegments,
	getPageTitle,
} from "../_db/queries.server";
import { splitSegments } from "../_domain/split-segments";
import type { TranslateChunkParams, TranslateJobParams } from "../types";

export async function orchestrateTranslation(params: TranslateJobParams) {
	const logger = createServerLogger("translate-orchestrator", {
		translationJobId: params.translationJobId,
		pageId: params.pageId,
		targetLocale: params.targetLocale,
		aiModel: params.aiModel,
	});
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
	logger.info({ totalChunks }, "Number of translation chunks");

	// If there is nothing to translate, finalize immediately.
	if (totalChunks === 0) {
		await markJobCompleted(params.translationJobId);
		return { ok: true, shouldRevalidate: true };
	}

	// Mark job started only when there is work to do
	await markJobInProgress(params.translationJobId);

	// Publish each chunk as an individual QStash message to /api/translate/chunk
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
				retries: 0, // API層でリトライ済みのため、QStashのリトライは不要
				timeout: 240,
			});
		}),
	);

	return { ok: true, shouldRevalidate: false };
}
