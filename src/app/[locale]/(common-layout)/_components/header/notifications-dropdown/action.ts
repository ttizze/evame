"use server";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/lib/auth-server";
import { revalidateAllLocales } from "@/lib/revalidate-utils";
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
	revalidateAllLocales("/");
	return {
		success: true,
		data: undefined,
	};
}
