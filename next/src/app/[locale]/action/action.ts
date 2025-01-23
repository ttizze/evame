import { signIn, signOut } from "@/auth";

export async function signInWithGoogleAction() {
	"use server";
	await signIn("google");
}

/**
 * Server action: sign in with 'resend'
 */
export async function signInWithResendAction(formData: FormData) {
	"use server";
	await signIn("resend", formData);
}

/**
 * Server action: sign out
 */
export async function signOutAction() {
	"use server";
	await signOut();
}


