const OPEN_GRAPH_IMAGE_SEGMENT = "opengraph-image-8p799s";

export async function GET(req: Request): Promise<Response> {
	const { searchParams } = new URL(req.url);
	const locale: string = searchParams.get("locale") || "en";
	return Response.redirect(
		new URL(`/${locale}/${OPEN_GRAPH_IMAGE_SEGMENT}`, req.url),
		307,
	);
}
