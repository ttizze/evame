import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sentry-example-api")({
	server: {
		handlers: {
			GET: () => {
				throw new Error("Sentry Example API Route Error");
			},
		},
	},
});
