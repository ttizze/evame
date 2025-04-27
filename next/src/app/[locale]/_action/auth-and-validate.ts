import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { redirect } from "next/navigation";
// lib/auth-and-validate.ts
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

export const requireAuthDefaultDeps: RequireAuthDeps = {
	getCurrentUser,
	redirect,
};

export async function requireAuth(
	deps: RequireAuthDeps = requireAuthDefaultDeps,
): Promise<{ id: string; handle: string }> {
	const user = await deps.getCurrentUser();
	if (!user?.id) deps.redirect("/auth/login");

	// userはnullではないことが保証されている
	return { id: user.id, handle: user.handle };
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
			};
			data: z.infer<T>;
	  }
	| { success: false; zodErrors: Record<string, string[]> }
> {
	const user = await deps.getCurrentUser();
	if (!user?.id) deps.redirect("/auth/login");

	const parsed = await deps.parseFormData(schema, formData);
	console.log("parsed", parsed);
	if (!parsed.success) {
		return {
			success: false,
			zodErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
		};
	}

	/* 3. 成功 ――――――――――――――――――― */
	return {
		success: true,
		currentUser: { id: user.id, handle: user.handle },
		data: parsed.data,
	};
}
