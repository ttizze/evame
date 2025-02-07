"use server";

import type { ActionState } from "@/app/types";
import { signIn, signOut } from "@/auth";
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

export type SignInWithResendState = ActionState & {
	fieldErrors?: {
		email?: string;
	};
};

export async function signInWithResendAction(
	previousState: SignInWithResendState,
	formData: FormData,
) {
	const validation = loginSchema.safeParse({
		email: formData.get("email"),
	});

	if (!validation.success) {
		return { fieldErrors: { email: "Invalid email address" } };
	}

	await signIn("resend", formData);

	return {
		success: "Logged in successfully",
	};
}

export async function signOutAction() {
	await signOut();
}
