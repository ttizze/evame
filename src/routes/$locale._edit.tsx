import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_edit")({
	component: EditLayout,
});

function EditLayout() {
	return <Outlet />;
}
