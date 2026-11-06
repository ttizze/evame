import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/$locale/_common/$handle_/$pageSlug")({
	validateSearch: z.object({
		page: z.coerce.number().int().positive().catch(1).optional(),
	}),
});
