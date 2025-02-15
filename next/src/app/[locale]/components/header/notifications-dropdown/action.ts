"use server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { markAllNotificationAsRead } from "./db/mutations.server";
export async function markNotificationAsReadAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}
	await markAllNotificationAsRead();
	revalidatePath("/");
	return {
		success: true,
	};
}
