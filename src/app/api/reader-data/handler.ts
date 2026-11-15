import { toJSONAsync } from "seroval";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { loadReaderData } from "./_service/load-reader-data";

export async function getReaderData(request: Request) {
	const params = new URL(request.url).searchParams;
	const data = await loadReaderData(
		params.get("path") ?? "",
		params.get("search") ?? "",
		request.headers,
	);
	return Response.json(
		data
			? await toJSONAsync({
					page: data,
					gaTrackingId: process.env.GOOGLE_ANALYTICS_ID ?? "",
				})
			: null,
		{
			status: data ? 200 : 404,
			headers: PRIVATE_RESPONSE_HEADERS,
		},
	);
}
