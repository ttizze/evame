import type { PageStatus } from "@/db/types";

export const TIPITAKA_ROOT_SLUG = "tipitaka" as const;
export const TIPITAKA_SYSTEM_USER_HANDLE = "evame" as const;
export const TIPITAKA_SOURCE_LOCALE = "pi" as const;

export function isPagePubliclyReadable(input: {
	isTipitakaPage: boolean;
	publishedAt: Date | null;
	status: PageStatus;
}): boolean {
	return (
		input.status === "PUBLIC" ||
		(input.isTipitakaPage &&
			input.status === "ARCHIVE" &&
			input.publishedAt !== null)
	);
}
