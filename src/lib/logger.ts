/**
 * Pinoベースの構造化ロガー
 * Next.js App Router用に最適化
 *
 * 特徴:
 * - 高速な構造化ログ（JSON形式）
 * - すべての環境でJSON形式で出力
 * - Sentryとの統合
 * - 環境変数によるログレベル制御
 *
 * ログ量のベストプラクティス:
 * - 本番環境ではINFO以上のみ記録（DEBUGは開発環境のみ）
 * - 正常フローでのログは最小限に（エラー・警告・重要なビジネスイベントのみ）
 * - 高頻度イベントはサンプリングを検討
 * - 機密情報は含めない
 *
 * 注意: Next.jsランタイムではworker threadsが使えないため、
 * pino-prettyのtransportは使用しません。JSON形式のログを出力します。
 */

import pino from "pino";

/**
 * ログレベルを取得（実行時に評価）
 */
function getLogLevel(): string {
	const isDevelopment = process.env.NODE_ENV === "development";
	return process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");
}

/**
 * Pinoロガーの基本設定を取得（実行時に評価）
 */
function getPinoConfig(): pino.LoggerOptions {
	return {
		level: getLogLevel(),
		formatters: {
			level: (label) => {
				return { level: label };
			},
		},
		timestamp: pino.stdTimeFunctions.isoTime,
	};
}

/**
 * デフォルトロガーインスタンス（実行時に初期化）
 */
export const logger = pino(getPinoConfig());

/**
 * サービス固有のロガーを作成
 * @param service サービス名（例: "page-detail", "auth"）
 */
export const createLogger = (service: string): pino.Logger => {
	// ロガーを作成する前に、現在の環境変数に基づいてレベルを更新
	// これにより、実行時にLOG_LEVELが変更されても反映される
	logger.level = getLogLevel();
	return logger.child({ service });
};
