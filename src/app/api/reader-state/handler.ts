import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { isFollowing } from "@/app/[locale]/(common-layout)/[handle]/_db/queries";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";

export async function getReaderState(request: Request) {
	const user = await getCurrentUserFromHeaders(request.headers);
	const targetUserId = new URL(request.url).searchParams.get("targetUserId");
	return Response.json(
		{
			isFollowing:
				user && targetUserId ? await isFollowing(user.id, targetUserId) : false,
		},
		{ headers: PRIVATE_RESPONSE_HEADERS },
	);
}
