import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage, { metadata } from "@/app/[locale]/privacy/page";

export const Route = createFileRoute("/$locale/privacy")({
	component: PrivacyPolicyPage,
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
