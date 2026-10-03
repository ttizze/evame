import { createFileRoute } from "@tanstack/react-router";
import MaintenancePage, { metadata } from "./-maintenance-page";

export const Route = createFileRoute("/$locale/maintenance")({
	component: MaintenancePage,
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
