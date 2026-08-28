import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/")({
	component: LocaleIndex,
});

function LocaleIndex() {
	return null;
}
