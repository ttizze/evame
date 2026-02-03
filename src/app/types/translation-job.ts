import { z } from "zod";
import type { TranslationStatus } from "@/db/types";

const translationStatusValues = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"FAILED",
] as const satisfies readonly TranslationStatus[];

const translationJobStatusSchema = z.enum(translationStatusValues);
export function isTranslationJobTerminalStatus(
	status: TranslationStatus,
): boolean {
	return status === "COMPLETED" || status === "FAILED";
}

export const translationJobForToastSchema = z.object({
	id: z.number(),
	locale: z.string(),
	status: translationJobStatusSchema,
	progress: z.number(),
	error: z.string(),
	page: z.object({
		slug: z.string(),
		user: z.object({
			handle: z.string(),
		}),
	}),
});

const translationJobForTranslationAPI = z.object({
	id: z.number(),
	locale: z.string(),
	status: translationJobStatusSchema,
	progress: z.number(),
	error: z.string(),
	aiModel: z.string(),
	pageId: z.number(),
	page: z.object({
		slug: z.string(),
		user: z.object({
			handle: z.string(),
		}),
	}),
});

export type TranslationJobForToast = z.infer<
	typeof translationJobForToastSchema
>;
export type TranslationJobForTranslationAPI = z.infer<
	typeof translationJobForTranslationAPI
>;
