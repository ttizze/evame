import { postSyncPush } from "./handler";

export function POST(request: Request): Promise<Response> {
	return postSyncPush(request);
}
