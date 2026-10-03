import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/login")({
	beforeLoad: ({ location }) => {
		throw redirect({
			to: "/$locale/auth/login",
			params: { locale: "en" },
			search: location.search,
		});
	},
});
