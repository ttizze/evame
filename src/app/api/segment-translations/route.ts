import {
	deleteSegmentTranslation,
	getSegmentTranslations,
	patchSegmentTranslationVote,
	postSegmentTranslation,
} from "./handler";

export function GET(request: Request): Promise<Response> {
	return getSegmentTranslations(request);
}

export async function POST(request: Request): Promise<Response> {
	const result = await postSegmentTranslation(request);
	return result.response;
}

export async function PATCH(request: Request): Promise<Response> {
	const result = await patchSegmentTranslationVote(request);
	return result.response;
}

export async function DELETE(request: Request): Promise<Response> {
	const result = await deleteSegmentTranslation(request);
	return result.response;
}
