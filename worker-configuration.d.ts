declare module "cloudflare:workers" {
	export const WorkerEntrypoint: typeof import("@cloudflare/workers-types").CloudflareWorkersModule.WorkerEntrypoint;
	export const cache: import("@cloudflare/workers-types").CacheContext;
	export const env: {
		PREVIEW_READER_ORIGIN?: string;
		PREVIEW_GATEWAY_ORIGIN?: string;
		PREVIEW_READER_SECRET?: string;
		READER: import("@cloudflare/workers-types").Fetcher;
		BACKEND: import("@cloudflare/workers-types").Fetcher;
		SENTRY_DSN?: string;
		SETTINGS: import("@cloudflare/workers-types").KVNamespace;
		UPLOADS: import("@cloudflare/workers-types").R2Bucket;
		IMAGES: import("@cloudflare/workers-types").ImagesBinding;
		ASSETS: import("@cloudflare/workers-types").Fetcher;
		CF_VERSION_METADATA: import("@cloudflare/workers-types").WorkerVersionMetadata;
	};
}
