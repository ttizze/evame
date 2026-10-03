declare module "cloudflare:workers" {
	export const env: {
		SETTINGS: import("@cloudflare/workers-types").KVNamespace;
		UPLOADS: import("@cloudflare/workers-types").R2Bucket;
		IMAGES: import("@cloudflare/workers-types").ImagesBinding;
		ASSETS: import("@cloudflare/workers-types").Fetcher;
		CF_VERSION_METADATA: import("@cloudflare/workers-types").WorkerVersionMetadata;
	};
}
