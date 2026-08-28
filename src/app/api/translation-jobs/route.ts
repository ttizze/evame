import type { NextRequest } from "next/server";
import { getTranslationJobs } from "./handler";

export function GET(request: NextRequest): Promise<Response> {
	return getTranslationJobs(request);
}
