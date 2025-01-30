import type { Page } from "@prisma/client";
import { z } from "zod";

export const translationInputSchema = z
	.object({
		url: z.string().url().optional(),
		folder: z.array(z.instanceof(File)).optional(),
		aiModel: z.string(),
	})
	.refine((data) => data.url || (data.folder && data.folder.length > 0), {
		message:
			"URLまたはフォルダ（1つ以上のファイル）のいずれかを指定してください",
	});

export type PageWithTitle = Omit<
	Page,
	| "content"
	| "pageSegments"
	| "translations"
	| "userId"
	| "sourceLocale"
	| "isArchived"
	| "createdAt"
	| "updatedAt"
> & {
	title: string;
	createdAt: string;
	updatedAt: string;
};
