import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import type { ActionResponse } from "@/app/types";
import { updateUserTargetLocales } from "./db/mutations.server";

const schema = z.object({
	locales: z.array(z.string()).max(4),
});

export type SaveTargetLocalesActionState = ActionResponse<boolean>;

const formDataValidator = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}
	return value;
};

export const saveTargetLocales = createServerFn({ method: "POST" })
	.validator(formDataValidator)
	.handler(
		async ({ data: formData }): Promise<SaveTargetLocalesActionState> => {
			const parsed = schema.safeParse({
				locales: formData.getAll("locales"),
			});
			if (!parsed.success) {
				return {
					success: false,
					zodErrors: parsed.error.flatten().fieldErrors,
				};
			}

			const currentUser = await getCurrentUserFromHeaders(
				new Headers(getRequestHeaders()),
			);
			if (!currentUser?.id) {
				throw redirect({ href: "/auth/login" });
			}
			await updateUserTargetLocales(currentUser.id, parsed.data.locales);
			return { success: true, data: true };
		},
	);
