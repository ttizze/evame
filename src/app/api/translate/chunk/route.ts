import { revalidateTag } from "next/cache";
import { withQstashVerification } from "../_utils/with-qstash-signature";
import { postTranslateChunk } from "./handler";

const verifiedPostTranslateChunk = withQstashVerification(async (request) => {
	const result = await postTranslateChunk(request);
	if (result.completedPageId !== undefined) {
		revalidateTag(`page:${result.completedPageId}`, { expire: 0 });
		revalidateTag(`page-translation-jobs:${result.completedPageId}`, {
			expire: 0,
		});
	}
	return result.response;
});

export const POST = verifiedPostTranslateChunk;
