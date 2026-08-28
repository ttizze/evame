import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { supportedLocaleOptions } from "@/app/_constants/locale";

const locales = supportedLocaleOptions.map((option) => option.code);
const localeSchema = z.string().refine((locale) => locales.includes(locale));

const profileEditDataInput = z.object({
	locale: localeSchema,
	handle: z.string().min(1),
});

const profileEditFormInput = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}

	const locale = value.get("locale");
	if (typeof locale !== "string" || !locales.includes(locale)) {
		throw new Error("Invalid locale");
	}

	return value;
};

async function getCurrentUser() {
	const { getCurrentUserFromHeaders } = await import(
		"@/app/_service/current-user"
	);
	return getCurrentUserFromHeaders(new Headers(getRequestHeaders()));
}

export const getProfileEditData = createServerFn({ method: "GET" })
	.validator(profileEditDataInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUser();
		if (!currentUser || currentUser.handle !== data.handle) {
			throw redirect({ href: `/${data.locale}/auth/login` });
		}

		const { fetchUserByHandle } = await import("@/app/_db/queries.server");
		const user = await fetchUserByHandle(currentUser.handle);
		return user ? currentUser : null;
	});

export const updateProfile = createServerFn({ method: "POST" })
	.validator(profileEditFormInput)
	.handler(async ({ data }) => {
		const locale = data.get("locale");
		const handle = data.get("handle");
		if (typeof locale !== "string" || typeof handle !== "string") {
			throw new Error("Invalid profile edit form data");
		}

		const currentUser = await getCurrentUser();
		if (!currentUser) {
			throw redirect({ href: `/${locale}/auth/login` });
		}

		const { updateProfileForUser } = await import(
			"@/app/[locale]/(common-layout)/[handle]/edit/_service/profile-edit"
		);
		const result = await updateProfileForUser(currentUser.id, data);
		if (result.success && handle !== currentUser.handle) {
			throw redirect({ href: `/${locale}/${handle}/edit` });
		}
		return result;
	});

export const updateProfileImage = createServerFn({ method: "POST" })
	.validator(profileEditFormInput)
	.handler(async ({ data }) => {
		const locale = data.get("locale");
		if (typeof locale !== "string") {
			throw new Error("Invalid profile image form data");
		}

		const currentUser = await getCurrentUser();
		if (!currentUser) {
			throw redirect({ href: `/${locale}/auth/login` });
		}

		const { updateProfileImageForUser } = await import(
			"@/app/[locale]/(common-layout)/[handle]/edit/_service/profile-edit"
		);
		return updateProfileImageForUser(currentUser.id, data);
	});
