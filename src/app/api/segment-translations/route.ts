import { revalidateTag } from "next/cache";
import { getSegmentTranslations, postSegmentTranslation } from "./handler";

export function GET(request: Request): Promise<Response> {
	return getSegmentTranslations(request);
}

export async function POST(request: Request): Promise<Response> {
	const result = await postSegmentTranslation(request);
	if (result.pageId !== undefined) {
		// updateTag is limited to Server Actions; expire: 0 gives this route the same immediate invalidation.
		revalidateTag(`page:${result.pageId}`, { expire: 0 });
	}
	return result.response;
}
