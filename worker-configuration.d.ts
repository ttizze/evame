declare module "cloudflare:workers" {
	export const WorkerEntrypoint: typeof import("@cloudflare/workers-types").CloudflareWorkersModule.WorkerEntrypoint;
	export const cache: import("@cloudflare/workers-types").CacheContext;
	export const env: {
		DATABASE_MIGRATION?: string;
		SENTRY_DSN?: string;
		SETTINGS: import("@cloudflare/workers-types").KVNamespace;
		PUBLIC_HTML: import("@cloudflare/workers-types").R2Bucket;
		UPLOADS: import("@cloudflare/workers-types").R2Bucket;
		IMAGES: import("@cloudflare/workers-types").ImagesBinding;
		ASSETS: import("@cloudflare/workers-types").Fetcher;
		CF_VERSION_METADATA: import("@cloudflare/workers-types").WorkerVersionMetadata;
	};
}
