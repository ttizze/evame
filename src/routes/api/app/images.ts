import { createFileRoute } from "@tanstack/react-router";
import { postAppImage } from "@/app/api/app/images/handler";

export const Route = createFileRoute("/api/app/images")({
	server: { handlers: { POST: ({ request }) => postAppImage(request) } },
});
