import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { createPagesExport } from "./_service/create-export";

export async function getPagesExport(request: Request) {
	const user = await getCurrentUserFromHeaders(request.headers);
	if (!user)
		return new Response(null, {
			status: 401,
			headers: PRIVATE_RESPONSE_HEADERS,
		});
	const body = await createPagesExport(
		user.id,
		new URL(request.url).origin,
		request.signal,
	);
	return new Response(body, {
		headers: {
			...PRIVATE_RESPONSE_HEADERS,
			"Content-Type": "application/zip",
			"Content-Disposition": 'attachment; filename="evame-export.zip"',
		},
	});
}
