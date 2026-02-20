import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }) => {
	if (url.searchParams.get("fail") === "1") {
		throw new Error("Sentry Example API Route Error");
	}

	return json({
		status: "ok",
		message: "Append ?fail=1 to trigger Sentry test error",
	});
};
