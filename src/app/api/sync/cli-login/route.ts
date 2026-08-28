import { getSyncCliLogin } from "./handler";

export function GET(request: Request): Promise<Response> {
	return getSyncCliLogin(request);
}
