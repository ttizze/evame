"use client";

import { useActionState } from "react";
import useSWR, { type SWRConfiguration, type KeyedMutator } from "swr";
import type { ActionResponse } from "@/app/types";

/**
 * SWR + Server Action を組み合わせたカスタムフック
 *
 * @description
 * - SWR でデータをフェッチ
 * - Server Action でデータを更新
 * - アクション成功時に SWR キャッシュを自動更新
 *
 * @example
 * ```tsx
 * const { data, isLoading, isPending, formAction, mutate } = useServerMutation({
 *   swrKey: `/api/likes?pageId=${pageId}`,
 *   fetcher: (url) => fetch(url).then(r => r.json()),
 *   serverAction: toggleLikeAction,
 *   fallbackData: { liked: false, count: 0 },
 *   // オプション: 楽観的更新
 *   onBeforeAction: (formData, currentData) => ({
 *     ...currentData,
 *     liked: !currentData.liked,
 *   }),
 * });
 * ```
 */

type UseServerMutationOptions<TData, TActionData, TFormError> = {
	/** SWR のキー */
	swrKey: string;
	/** データフェッチャー */
	fetcher: (url: string) => Promise<TData>;
	/** Server Action */
	serverAction: (
		prevState: ActionResponse<TActionData, TFormError>,
		formData: FormData,
	) => Promise<ActionResponse<TActionData, TFormError>>;
	/** 初期データ（SSR 用） */
	fallbackData: TData;
	/** SWR の設定 */
	swrOptions?: SWRConfiguration<TData>;
	/** アクション実行前の楽観的更新（オプション） */
	onBeforeAction?: (formData: FormData, currentData: TData) => TData;
	/** アクション成功時のデータ変換 */
	transformActionResult?: (actionData: TActionData, currentData: TData) => TData;
	/** アクション成功時のコールバック */
	onSuccess?: (data: TActionData) => void;
	/** アクション失敗時のコールバック */
	onError?: (error: ActionResponse<TActionData, TFormError>) => void;
};

type UseServerMutationReturn<TData, TActionData, TFormError> = {
	/** 現在のデータ */
	data: TData | undefined;
	/** SWR のローディング状態 */
	isLoading: boolean;
	/** Server Action の実行中状態 */
	isPending: boolean;
	/** フォームアクション */
	formAction: (formData: FormData) => void;
	/** SWR の mutate 関数 */
	mutate: KeyedMutator<TData>;
	/** 楽観的更新 + アクション実行を行うハンドラ */
	handleSubmit: (formData: FormData) => void;
	/** Server Action の最新レスポンス */
	actionState: ActionResponse<TActionData, TFormError>;
};

export function useServerMutation<
	TData,
	TActionData = TData,
	TFormError = Record<string, unknown>,
>({
	swrKey,
	fetcher,
	serverAction,
	fallbackData,
	swrOptions,
	onBeforeAction,
	transformActionResult,
	onSuccess,
	onError,
}: UseServerMutationOptions<
	TData,
	TActionData,
	TFormError
>): UseServerMutationReturn<TData, TActionData, TFormError> {
	// SWR でデータをフェッチ
	const { data, mutate, isLoading } = useSWR<TData>(swrKey, fetcher, {
		fallbackData,
		revalidateOnFocus: false,
		revalidateIfStale: false,
		revalidateOnMount: false,
		...swrOptions,
	});

	// Server Action の状態管理
	const [actionState, formAction, isPending] = useActionState<
		ActionResponse<TActionData, TFormError>,
		FormData
	>(
		async (prevState, formData) => {
			const result = await serverAction(prevState, formData);

			if (result.success) {
				// アクション成功時に SWR キャッシュを更新
				if (transformActionResult && data) {
					void mutate(transformActionResult(result.data, data), {
						revalidate: false,
					});
				} else if (result.data !== undefined) {
					// TActionData と TData が同じ型の場合
					void mutate(result.data as unknown as TData, { revalidate: false });
				}
				onSuccess?.(result.data);
			} else {
				onError?.(result);
			}

			return result;
		},
		{ success: false } as ActionResponse<TActionData, TFormError>,
	);

	// 楽観的更新 + アクション実行を行うハンドラ
	const handleSubmit = (formData: FormData) => {
		// 楽観的更新
		if (onBeforeAction && data) {
			const optimisticData = onBeforeAction(formData, data);
			void mutate(optimisticData, { revalidate: false });
		}

		// Server Action 実行
		formAction(formData);
	};

	return {
		data,
		isLoading,
		isPending,
		formAction,
		mutate,
		handleSubmit,
		actionState,
	};
}
