import { getCurrentUser } from "@/lib/auth-server";
import { createServerLogger } from "@/lib/logger.server";
import { parseFormData } from "@/lib/parse-form-data";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { z } from "zod";
export type AuthDeps = {
	getCurrentUser: typeof getCurrentUser;
	parseFormData: typeof parseFormData;
	redirect: typeof redirect;
};
export const authDefaultDeps: AuthDeps = {
	getCurrentUser,
	parseFormData,
	redirect,
};

export type RequireAuthDeps = {
	getCurrentUser: typeof getCurrentUser;
	redirect: typeof redirect;
};

const requireAuthDefaultDeps: RequireAuthDeps = {
	getCurrentUser,
	redirect,
};

export async function requireAuth(
	deps: RequireAuthDeps = requireAuthDefaultDeps,
): Promise<{ id: string; handle: string; plan: string }> {
	const user = await deps.getCurrentUser();
	if (!user?.id) deps.redirect("/auth/login" as Route);

	// userはnullではないことが保証されている
	return { id: user.id, handle: user.handle, plan: user.plan };
}
export async function authAndValidate<T extends z.ZodTypeAny>(
	schema: T,
	formData: FormData,
	deps: AuthDeps = authDefaultDeps,
): Promise<
	| {
			success: true;
			currentUser: {
				id: string;
				handle: string;
				plan: string;
			};
			data: z.infer<T>;
	  }
	| { success: false; zodErrors: Record<string, string[]> }
> {
	const user = await requireAuth(deps);

	const parsed = await deps.parseFormData(schema, formData);
	const logger = createServerLogger("auth-and-validate", { userId: user.id });
	if (!parsed.success) {
		// 機密情報漏洩を防ぐため、失敗したフィールド名のみをログに記録（入力値は含めない）
		const failedFields = Object.keys(parsed.error.flatten().fieldErrors);
		logger.warn({ failedFields }, "Zod validation errors");
		return {
			success: false,
			zodErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
		};
	}
	/* 3. 成功 ――――――――――――――――――― */
	return {
		success: true,
		currentUser: { id: user.id, handle: user.handle, plan: user.plan },
		data: parsed.data,
	};
}
