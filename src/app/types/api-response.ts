import { NextResponse } from "next/server";

/**
 * 統一された API レスポンス型
 *
 * 成功時: { success: true, data: T }
 * 失敗時: { success: false, error: string, code?: string }
 */
export type ApiResponse<T = unknown> =
	| { success: true; data: T }
	| { success: false; error: string; code?: ApiErrorCode };

/**
 * エラーコード定義
 */
export type ApiErrorCode =
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "VALIDATION_ERROR"
	| "INTERNAL_ERROR"
	| "RATE_LIMITED"
	| "BAD_REQUEST";

/**
 * API レスポンスを作成するヘルパー関数
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
	return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
	error: string,
	status = 500,
	code?: ApiErrorCode,
): NextResponse<ApiResponse<never>> {
	return NextResponse.json({ success: false, error, code }, { status });
}

/**
 * よく使うエラーレスポンス
 */
export const ApiErrors = {
	unauthorized: (message = "Unauthorized") =>
		apiError(message, 401, "UNAUTHORIZED"),

	forbidden: (message = "Forbidden") =>
		apiError(message, 403, "FORBIDDEN"),

	notFound: (message = "Not found") =>
		apiError(message, 404, "NOT_FOUND"),

	badRequest: (message = "Bad request") =>
		apiError(message, 400, "BAD_REQUEST"),

	validationError: (message = "Validation error") =>
		apiError(message, 400, "VALIDATION_ERROR"),

	internal: (message = "Internal server error") =>
		apiError(message, 500, "INTERNAL_ERROR"),

	rateLimited: (message = "Rate limited") =>
		apiError(message, 429, "RATE_LIMITED"),
} as const;
