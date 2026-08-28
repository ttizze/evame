import { getPageLikeStates } from "./handler";

export function GET(request: Request): Promise<Response> {
	return getPageLikeStates(request);
}
