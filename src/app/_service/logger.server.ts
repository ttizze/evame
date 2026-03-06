/**
 * サーバー側専用ロガー
 * Next.jsのサーバーコンポーネント、Server Actions、API Routesで使用
 */

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
 * 追加コンテキストを child logger に束ねる
 */
export const createServerLogger = (
	service: string,
	context?: LoggerContext,
): Logger => {
	const childLogger = createLogger(service);

	// コンテキストをロガーに追加
	return context ? childLogger.child({ service, ...context }) : childLogger;
};

/**
 * サーバー側のデフォルトロガー
 */
export const serverLogger = createServerLogger("server");
