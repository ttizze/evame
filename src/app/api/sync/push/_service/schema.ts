import { z } from "zod";

const slugPattern = /^[0-9a-z-]{1,50}$/;

const pushInput = z.object({
	slug: z.string().regex(slugPattern, "slug must match [0-9a-z-]{1,50}"),
	expected_revision: z.string().nullable(),
	title: z.string().min(1),
	body: z.string().max(1_000_000),
	published_at: z.coerce.date().nullable().optional(),
});

export const syncPushSchema = z.object({
	dry_run: z.boolean().optional(),
	inputs: z.array(pushInput).min(1).max(100),
});

export type SyncPushInput = z.infer<typeof syncPushSchema>;
export type PushInput = z.infer<typeof pushInput>;
