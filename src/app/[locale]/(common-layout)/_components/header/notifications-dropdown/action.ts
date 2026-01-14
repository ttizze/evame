"use server";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/_service/auth-server";
import { revalidateAllLocales } from "@/app/_service/revalidate-utils";
import type { ActionResponse } from "@/app/types";
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
