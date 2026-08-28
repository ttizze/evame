import { incrementPageView } from "./handler";

export async function POST(
	_request: Request,
	context: RouteContext<"/api/page-views/[pageId]/increment">,
) {
	const { pageId } = await context.params;
	return incrementPageView(pageId);
}
