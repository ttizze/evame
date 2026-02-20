// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: {
				id: string;
				userId: string;
				expiresAt: Date;
			} | null;
			user: {
				id: string;
				handle: string;
				name: string;
				image: string;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				ASSETS?: {
					fetch: typeof fetch;
				};
				MAINTENANCE_KV?: unknown;
			};
			cf?: unknown;
			ctx: {
				waitUntil(promise: Promise<unknown>): void;
			};
		}
	}
}

export {};
