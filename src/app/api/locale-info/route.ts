import type { NextRequest } from "next/server";
import { getLocaleInfo } from "./handler";

export function GET(request: NextRequest): Promise<Response> {
	return getLocaleInfo(request);
}
