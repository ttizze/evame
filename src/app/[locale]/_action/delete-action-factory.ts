// lib/createDeleteAction.ts  ───────────────────────────────────────────
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import type { ActionResponse } from "@/app/types";
import { revalidateAllLocales } from "@/lib/revalidate-utils";
import {
	type AuthDeps,
	authAndValidate,
	authDefaultDeps,
} from "./auth-and-validate";

// lib/createDeleteAction.ts  (抜粋)

type DeleteDeps = AuthDeps & {
	revalidatePath: typeof revalidatePath;
	redirect: typeof redirect;
};

const defaultDeps: DeleteDeps = {
	...authDefaultDeps,
	revalidatePath,
	redirect,
};
export function deleteActionFactory<TSchema extends z.ZodTypeAny>(
	config: {
		inputSchema: TSchema;
		deleteById: (input: z.infer<TSchema>, userId: string) => Promise<void>;
		buildRevalidatePaths?: (
			input: z.infer<TSchema>,
			userHandle: string,
		) => string[];
		buildSuccessRedirect?: (
			input: z.infer<TSchema>,
			userHandle: string,
		) => string;
	},
	deps: DeleteDeps = defaultDeps,
) {
	const {
		inputSchema,
		deleteById,
		buildRevalidatePaths = () => [],
		buildSuccessRedirect,
	} = config;
	return async function deleteAction(
		_prev: ActionResponse,
		formData: FormData,
	): Promise<ActionResponse> {
		/** 1. 認証 + バリデーション */
		const v = await authAndValidate(inputSchema, formData, deps);
		if (!v.success) {
			return { success: false, zodErrors: v.zodErrors };
		}
		const { currentUser, data } = v;

		/** 2. 削除 */
		await deleteById(data, currentUser.id);

		/** 3. キャッシュ再検証 */
		for (const p of buildRevalidatePaths(data, currentUser.handle)) {
			revalidateAllLocales(p);
		}

		/** 4. リダイレクト */
		if (buildSuccessRedirect) {
			deps.redirect(buildSuccessRedirect(data, currentUser.handle) as Route);
		}
		return { success: true, data: undefined, message: "Deleted successfully" };
	};
}
