import { createFileRoute } from "@tanstack/react-router";
import { generateRobotsResponse } from "./-seo-robots";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: () => generateRobotsResponse(),
		},
	},
});
