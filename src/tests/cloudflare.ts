export const env = {};
export const cache: {
	purge?: (options: {
		tags?: string[];
		purgeEverything?: boolean;
	}) => Promise<{ success: boolean }>;
} = {};
export class WorkerEntrypoint<T> {
	constructor(
		protected ctx: import("@cloudflare/workers-types").ExecutionContext,
		protected env: T,
	) {}
}
