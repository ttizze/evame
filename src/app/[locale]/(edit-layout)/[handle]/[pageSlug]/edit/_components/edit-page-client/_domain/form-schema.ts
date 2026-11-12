import { z } from "zod";
import { pageTitleSchema } from "@/app/_domain/page-title";

export const formSchema = z.object({
	pageSlug: z.string().min(1),
	userLocale: z.string().min(1),
	title: z
		.string()
		.transform((value) => value.trim() || "untitled")
		.pipe(pageTitleSchema),
	pageContent: z.string(),
	contentFormat: z.enum(["html", "markdown"]).default("html"),
});
