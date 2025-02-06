"use server";

import type { ActionState } from "@/app/types";
import { signIn, signOut } from "@/auth";
import { parseWithZod } from "@conform-to/zod";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

export async function signInWithGoogleAction(
	previousState: ActionState,
	formData: FormData,
) {
	await signIn("google");
	return {
		success: "Logged in successfully",
	};
}

export async function signInWithResendAction(
	previousState: ActionState,
	formData: FormData,
) {
	const submission = parseWithZod(formData, { schema: loginSchema });

	if (submission.status !== "success") {
		return { error: "Invalid email address" };
	}

	await signIn("resend", formData);

	return {
		success: "Logged in successfully",
	};
}

export async function signOutAction() {
	await signOut();
}
