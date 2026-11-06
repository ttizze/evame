import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/$locale/_common/$handle")({
	validateSearch: z.object({
		page: z.coerce.number().int().positive().catch(1).default(1),
		query: z.string().catch("").default(""),
		tab: z.string().catch("home").default("home"),
		sort: z.enum(["popular", "new"]).catch("popular").default("popular"),
	}),
});
