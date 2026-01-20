// lib/create-action-factory.ts

import type { Route } from "next";
import { redirect } from "next/navigation";
import type { z } from "zod";
import type { ActionResponse } from "@/app/types";
import {
	type AuthDeps,
	authAndValidate,
	authDefaultDeps,
} from "./auth-and-validate";

/* ────────────── 共通依存 ────────────── */
type CreateDeps = AuthDeps & {
	redirect: typeof redirect;
};

const defaultDeps: CreateDeps = {
	...authDefaultDeps,
	redirect,
};

/* ────────────── Factory 本体 ────────────── */
export function createActionFactory<
	TSchema extends z.ZodType,
	TSuccess, // create が成功時に返す data の型
	TPublic = TSuccess, // クライアントに渡す型（デフォルト＝同じ）
>(
	config: {
		inputSchema: TSchema;

		/** 認証 + バリデーション後に呼ばれるロジック
		 *  失敗時は { success:false, … } を返して OK */
		create: (
			input: z.infer<TSchema>,
			currentUserId: string,
			deps: CreateDeps,
		) => Promise<ActionResponse<TSuccess>>;

		/** 成功時のみリダイレクト */
		buildSuccessRedirect?: (
			input: z.infer<TSchema>,
			userHandle: string,
			result: TSuccess,
		) => string;

		/** 成功時に公開用データへ整形（省略⇒そのまま） */
		buildResponse?: (data: TSuccess) => ActionResponse<TPublic>;
	},
	deps: CreateDeps = defaultDeps,
) {
	const {
		inputSchema,
		create,
		buildSuccessRedirect,
		buildResponse = (d) => ({ success: true, data: d as unknown as TPublic }),
	} = config;

	return async function action(
		_prev: ActionResponse<TPublic>,
		formData: FormData,
	): Promise<ActionResponse<TPublic>> {
		/* 1. 認証 + バリデーション */
		const v = await authAndValidate(inputSchema, formData, deps);
		if (!v.success) return { success: false, zodErrors: v.zodErrors };

		const { currentUser, data } = v;

		/* 2. ドメインロジック（成功 / 失敗 両対応） */
		const res = await create(data, currentUser.id, deps);
		if (!res.success) return res; // ← 失敗なら即返却

		/* 3. リダイレクト（成功時のみ） */
		if (buildSuccessRedirect) {
			deps.redirect(
				buildSuccessRedirect(data, currentUser.handle, res.data) as Route,
			);
		}

		/* 4. 成功レスポンスを整形して返却 */
		return buildResponse(res.data);
	};
}
