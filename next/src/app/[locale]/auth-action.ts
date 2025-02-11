"use server";

import type { ActionResponse } from "@/app/types";
import { signIn, signOut } from "@/auth";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

export async function signInWithGoogleAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	await signIn("google");
	return {
		success: true,
	};
}

export type SignInWithResendState = ActionResponse<void, {
	email: string;
}>;

export async function signInWithResendAction(
	previousState: SignInWithResendState,
	formData: FormData,
): Promise<SignInWithResendState> {
	const validation = loginSchema.safeParse({
		email: formData.get("email"),
	});

	if (!validation.success) {
		return {
			success: false,
			zodErrors: validation.error.flatten().fieldErrors,
		};
	}

	await signIn("resend", formData);

	return {
		success: true,
	};
}

export async function signOutAction() {
	await signOut();
}
