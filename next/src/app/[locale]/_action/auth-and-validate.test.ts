import type { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import {
	type AuthDeps,
	type RequireAuthDeps,
	authAndValidate,
	requireAuth,
} from "./auth-and-validate";
/* ---------------- requireAuth ---------------- */
const redirectMock = vi.fn().mockImplementation(() => {
	throw new Error("redirect");
}) as unknown as typeof redirect;

describe("requireAuth", () => {
	it("サインインしていない場合は /auth/login へリダイレクトする", async () => {
		const deps: RequireAuthDeps = {
			getCurrentUser: vi.fn().mockResolvedValue(null),
			redirect: redirectMock,
		};

		await expect(requireAuth(deps)).rejects.toThrow("redirect");
		expect(deps.redirect).toHaveBeenCalledWith("/auth/login");
	});

	it("サインイン済みなら id と handle を返す", async () => {
		const deps: RequireAuthDeps = {
			getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", handle: "alice" }),
			redirect: vi.fn() as unknown as typeof redirect,
		};

		const user = await requireAuth(deps);
		expect(user).toEqual({ id: "u1", handle: "alice" });
		expect(deps.redirect).not.toHaveBeenCalled();
	});
});

/* ---------------- authAndValidate ---------------- */

describe("authAndValidate", () => {
	const schema = z.object({ title: z.string() });

	it("バリデーションエラー時は success:false を返す", async () => {
		const deps: AuthDeps = {
			getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", handle: "alice" }),
			redirect: redirectMock,
			parseFormData: vi.fn().mockResolvedValue({
				success: false,
				error: new ZodError([]),
			}),
		};

		const result = await authAndValidate(schema, new FormData(), deps);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.zodErrors).toBeDefined();
		}
	});

	it("バリデーション成功時はパース済みデータと user を返す", async () => {
		const formData = new FormData();
		formData.set("title", "hello");

		const deps: AuthDeps = {
			getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", handle: "alice" }),
			redirect: vi.fn(),
			parseFormData: vi.fn().mockResolvedValue({
				success: true,
				data: { title: "hello" },
			}),
		};

		const result = await authAndValidate(schema, formData, deps);
		expect(result).toEqual({
			success: true,
			currentUser: { id: "u1", handle: "alice" },
			data: { title: "hello" },
		});
	});
});
