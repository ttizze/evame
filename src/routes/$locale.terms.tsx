import { createFileRoute } from "@tanstack/react-router";
import TermsPage, { metadata } from "./-terms-page";

export const Route = createFileRoute("/$locale/terms")({
	component: TermsPage,
	head: () => ({
		meta: [
			{ title: metadata.title },
			{
				name: "description",
				content: metadata.description,
			},
			{
				name: "robots",
				content: `${metadata.robots.index ? "index" : "noindex"}, ${metadata.robots.follow ? "follow" : "nofollow"}`,
			},
		],
	}),
});
