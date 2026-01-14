/**
 * Pinoベースの構造化ロガー
 *
 * - 本番以外: pino-prettyで読みやすく表示
 * - 本番: JSON形式（ログ管理ツール用）
 * - streamを使うことでNext.jsでも動作
 *
 * @see https://github.com/vercel/next.js/discussions/46987
 * @see logger.README.md
 */

import pino from "pino";
import pretty from "pino-pretty";

const isProduction = process.env.NODE_ENV === "production";
const isTest =
	process.env.VITEST !== undefined || process.env.NODE_ENV === "test";
const isCI = process.env.CI !== undefined;

/**
 * ログレベルを決定する
 *
 * 優先順位（高い順）:
 * 1. 環境変数 LOG_LEVEL（明示的に設定されている場合、最優先）
 * 2. テスト環境: "error"（テスト中のログ出力を抑制）
 * 3. CI環境: "warn"（CIでもエラーと警告のみ記録）
 * 4. 本番環境: "info"（エラー、警告、重要なビジネスイベント）
 * 5. 開発環境: "debug"（すべてのログを出力）
 */
function getLogLevel(): string {
	// 1. 環境変数で明示的に設定されている場合は最優先
	if (process.env.LOG_LEVEL) {
		return process.env.LOG_LEVEL;
	}

	// 2. テスト環境: error以上のみ（テスト中のログ出力を抑制）
	if (isTest) {
		return "error";
	}

	// 3. CI環境: warn以上（エラーと警告のみ）
	if (isCI) {
		return "warn";
	}

	// 4. 本番環境: info以上（エラー、警告、重要なビジネスイベント）
	if (isProduction) {
		return "info";
	}

	// 5. 開発環境: debug以上（すべてのログを出力）
	return "debug";
}

function getStream() {
	if (process.env.LOG_PRETTY === "true" || !isProduction) {
		return pretty({
			colorize: true,
			ignore: "pid,hostname",
			translateTime: "SYS:HH:MM:ss.l",
		});
	}
	return undefined;
}

/**
 * 機密情報として扱うフィールドのパス
 * これらのパスに一致する値は自動的に "[REDACTED]" に置換される
 *
 * @see https://github.com/pinojs/pino/blob/main/docs/redaction.md
 */
const REDACT_PATHS = [
	// 認証・セキュリティ関連
	"password",
	"*.password",
	"token",
	"*.token",
	"secret",
	"*.secret",
	"apiKey",
	"*.apiKey",
	"api_key",
	"*.api_key",
	"authorization",
	"*.authorization",
	"cookie",
	"*.cookie",
	"session",
	"*.session",
	"credential",
	"*.credential",
	// ネストされたオブジェクト内
	"*.*.password",
	"*.*.token",
	"*.*.secret",
	"*.*.apiKey",
];

const logger = pino(
	{
		level: getLogLevel(),
		formatters: { level: (label) => ({ level: label }) },
		timestamp: pino.stdTimeFunctions.isoTime,
		redact: {
			paths: REDACT_PATHS,
			censor: "[REDACTED]",
		},
	},
	getStream(),
);

export const createLogger = (service: string): pino.Logger => {
	logger.level = getLogLevel();
	return logger.child({ service });
};
