import { getSyncPull } from "./handler";

export function GET(request: Request): Promise<Response> {
	return getSyncPull(request);
}
