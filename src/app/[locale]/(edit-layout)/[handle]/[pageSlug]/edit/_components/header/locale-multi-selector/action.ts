import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { updateUserTargetLocales } from "../translation-settings/components/multi-locale-select/db/mutations.server";

const localesSchema = z.array(z.string()).max(4);

export const saveStandaloneTargetLocales = createServerFn({ method: "POST" })
	.validator(localesSchema)
	.handler(async ({ data: locales }) => {
		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser?.id) {
			throw redirect({ href: "/auth/login" });
		}
		await updateUserTargetLocales(currentUser.id, locales);
		return { success: true };
	});
