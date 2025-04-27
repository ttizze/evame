import type { ActionResponse } from "@/app/types";
// lib/createDeleteAction.ts  ───────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { type AuthDeps, authAndValidate } from "./auth-and-validate";
import { authDefaultDeps } from "./auth-and-validate";
// lib/createDeleteAction.ts  (抜粋)

export type DeleteDeps = AuthDeps & {
	revalidatePath: typeof revalidatePath;
	redirect: typeof redirect;
};

const defaultDeps: DeleteDeps = {
	...authDefaultDeps,
	revalidatePath,
	redirect,
};
export function createDeleteAction<TSchema extends z.ZodTypeAny>(
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
		_prev: ActionResponse<void>,
		formData: FormData,
	): Promise<ActionResponse<void>> {
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
			deps.revalidatePath(p);
		}

		/** 4. リダイレクト */
		if (buildSuccessRedirect) {
			deps.redirect(buildSuccessRedirect(data, currentUser.handle));
		}
		return { success: true };
	};
}
