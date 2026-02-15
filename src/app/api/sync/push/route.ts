import { NextResponse } from "next/server";
import { authenticateToken } from "../_service/authenticate-token";
import { buildJudgments } from "./_service/build-judgments";
import { executePush } from "./_service/execute-push";
import { syncPushSchema } from "./_service/schema";

export async function POST(request: Request) {
	const auth = await authenticateToken(request);
	if (!auth) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 422 });
	}

	const parsed = syncPushSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
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
	return NextResponse.json(responseBody, { status: httpStatus });
}
