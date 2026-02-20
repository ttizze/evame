import { json, type RequestHandler } from "@sveltejs/kit";
import { authenticateToken } from "@/app/api/sync/_service/authenticate-token";
import { buildJudgments } from "@/app/api/sync/push/_service/build-judgments";
import { executePush } from "@/app/api/sync/push/_service/execute-push";
import { syncPushSchema } from "@/app/api/sync/push/_service/schema";

export const POST: RequestHandler = async ({ request }) => {
	const auth = await authenticateToken(request);
	if (!auth) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON" }, { status: 422 });
	}

	const parsed = syncPushSchema.safeParse(body);
	if (!parsed.success) {
		return json(
			{ error: "Validation error", details: parsed.error.flatten() },
			{ status: 422 },
		);
	}

	const judgments = await buildJudgments(auth.userId, parsed.data);
	const result = await executePush(auth.userId, judgments, {
		dryRun: parsed.data.dry_run ?? false,
	});

	const httpStatus =
		result.status === "conflict"
			? 409
			: result.status === "applied" &&
					result.createdCount > 0 &&
					!(parsed.data.dry_run ?? false)
				? 201
				: 200;
	const { createdCount: _, ...responseBody } = result;
	return json(responseBody, { status: httpStatus });
};
