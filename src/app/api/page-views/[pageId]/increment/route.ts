import { fetchPageViewCount } from "@/app/[locale]/_db/page-utility-queries.server";
import { incrementPageView } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_db/mutations.server";
import { ApiErrors, apiSuccess } from "@/app/types/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
	_req: Request,
	context: RouteContext<"/api/page-views/[pageId]/increment">,
) {
	const { pageId } = await context.params;
	const id = Number(pageId);
	if (!Number.isFinite(id)) {
		return ApiErrors.badRequest("invalid pageId");
	}

	await incrementPageView(id);
	const count = await fetchPageViewCount(id);
	return apiSuccess({ count });
}
