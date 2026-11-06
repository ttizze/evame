import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/$locale/_common/search")({
	validateSearch: z.object({
		category: z
			.enum(["title", "user", "tags", "content"])
			.catch("title")
			.default("title"),
		page: z.coerce.number().int().positive().catch(1).default(1),
		query: z.string().catch("").default(""),
		tagPage: z.enum(["true", "false"]).catch("false").default("false"),
	}),
});
