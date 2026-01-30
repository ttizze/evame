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
import { createServerLogger } from "@/app/_service/logger.server";
import { markJobCompleted, markJobInProgress } from "../_db/mutations.server";
import {
	getAnnotationSegments,
	getPageCommentSegments,
	getPageSegments,
	getPageTitle,
} from "../_db/queries.server";
import { splitSegments } from "../_domain/split-segments";
import type { TranslateChunkParams, TranslateJobParams } from "../types";

const fetchSegments = async (params: TranslateJobParams) => {
	if (params.annotationContentId) {
		return await getAnnotationSegments(params.annotationContentId);
	}
	if (params.pageCommentId) {
		return await getPageCommentSegments(params.pageCommentId);
	}
	return await getPageSegments(params.pageId);
};

export async function orchestrateTranslation(params: TranslateJobParams) {
	const logger = createServerLogger("translate-orchestrator", {
		translationJobId: params.translationJobId,
		pageId: params.pageId,
		targetLocale: params.targetLocale,
		aiModel: params.aiModel,
	});
	// pageCommentId / annotationContentId に応じてセグメントを取得
	const segments = await fetchSegments(params);

	// ページタイトルを取得（翻訳プロンプト用）
	const title = (await getPageTitle(params.pageId)) ?? "";

	const sortedSegments = [...segments].sort((a, b) => a.number - b.number);
	const chunks = splitSegments(sortedSegments, params.aiModel);
	const totalChunks = chunks.length;
	logger.info({ totalChunks }, "Number of translation chunks");

	// If there is nothing to translate, finalize immediately.
	if (totalChunks === 0) {
		await markJobCompleted(params.translationJobId);
		return { ok: true };
	}

	// Mark job started only when there is work to do
	await markJobInProgress(params.translationJobId);

	// Publish each chunk as an individual QStash message to /api/translate/chunk
	const client = new Client({ token: process.env.QSTASH_TOKEN });
	const publishBaseUrl =
		process.env.QSTASH_PUBLISH_BASE_URL?.trim() || BASE_URL;

	// チャンクを遅延させて発行し、DB接続の圧迫を防ぐ
	// ローカル環境では1秒間隔、本番では0秒（並列実行）
	// QStashのdelayは秒単位
	const isLocal = publishBaseUrl.includes("localhost");
	const delayPerChunk = isLocal ? 1 : 0;

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
				translationContext: params.translationContext,
			};
			return client.publishJSON({
				url: `${publishBaseUrl}/api/translate/chunk`,
				body,
				deduplicationId: `translate-${params.translationJobId}-c${idx}`,
				retries: 3, // QStash配信失敗時もリトライ
				timeout: 240,
				delay: idx * delayPerChunk, // チャンクを遅延させて発行
			});
		}),
	);

	return { ok: true };
}
