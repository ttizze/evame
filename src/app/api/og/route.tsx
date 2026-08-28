import { getOgImage } from "./handler";

export async function GET(request: Request): Promise<Response> {
	return getOgImage(request);
}
