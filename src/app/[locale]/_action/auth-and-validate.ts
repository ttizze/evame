import type { Route } from "next";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { getCurrentUser } from "@/lib/auth-server";
import { parseFormData } from "@/lib/parse-form-data";
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
	console.log("parsed", parsed);
	if (!parsed.success) {
		console.log("zod error flatten", parsed.error.flatten());
		console.log("zod error errors", parsed.error);
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
