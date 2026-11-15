declare module "virtual:evame-reader-data" {
	export const getReaderData: typeof import("./src/app/api/reader-data/handler").getReaderData;
}
declare module "virtual:evame-public-pages" {
	const handler: {
		fetch(
			request: Request,
			env: typeof import("cloudflare:workers").env,
			context: import("@cloudflare/workers-types").ExecutionContext,
		): Promise<Response>;
	};
	export default handler;
}
