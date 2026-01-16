/**
 * サーバー側専用ロガー
 * Next.jsのサーバーコンポーネント、Server Actions、API Routesで使用
 *
 * Sentryとの統合が可能
 */

import * as Sentry from "@sentry/nextjs";
import type { Logger } from "pino";
import { createLogger } from "./logger";

interface LoggerContext {
	requestId?: string;
	userId?: string;
	path?: string;
	[key: string]: unknown;
}

/**
 * サーバー側用のロガーを作成
 * 必要に応じてSentryのコンテキストを設定
 */
export const createServerLogger = (
	service: string,
	context?: LoggerContext,
): Logger => {
	const childLogger = createLogger(service);

	// コンテキストをロガーに追加
	const logWithContext = context ? childLogger.child(context) : childLogger;

	// 本番環境でSentryにコンテキストを設定（必要に応じて）
	if (process.env.NODE_ENV === "production" && context) {
		try {
			Sentry.setContext("request", {
				service,
				...context,
			});
			if (context.userId) {
				Sentry.setUser({ id: context.userId });
			}
			if (context.requestId) {
				Sentry.setTag("requestId", context.requestId);
			}
		} catch {
			// Sentryが初期化されていない場合は無視
		}
	}

	return logWithContext;
};

/**
 * サーバー側のデフォルトロガー
 */
export const serverLogger = createServerLogger("server");
