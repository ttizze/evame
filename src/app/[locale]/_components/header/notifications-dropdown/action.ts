"use server";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/lib/auth-server";
import { markAllNotificationAsRead } from "./db/mutations.server";
export async function markNotificationAsReadAction(
	_previousState: ActionResponse,
	_formData: FormData,
): Promise<ActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		redirect("/auth/login" as Route);
	}
	await markAllNotificationAsRead();
	revalidatePath("/");
	return {
		success: true,
		data: undefined,
	};
}
