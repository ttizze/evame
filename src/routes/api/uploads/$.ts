import { createFileRoute } from "@tanstack/react-router";
import { getUpload } from "@/app/api/uploads/handler";

export const Route = createFileRoute("/api/uploads/$")({
	server: { handlers: { GET: ({ params }) => getUpload(params._splat ?? "") } },
});
