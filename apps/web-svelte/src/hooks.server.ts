import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = null;
	event.locals.user = null;

	if (!process.env.DATABASE_URL) {
		return resolve(event);
	}

	try {
		const { auth } = await import("@/auth");
		const sessionResult = await auth.api.getSession({
			headers: event.request.headers,
		});

		event.locals.session = sessionResult?.session
			? {
					id: sessionResult.session.id,
					userId: sessionResult.session.userId,
					expiresAt: sessionResult.session.expiresAt,
				}
			: null;

		event.locals.user = sessionResult?.user
			? {
					id: sessionResult.user.id,
					handle: sessionResult.user.handle,
					name: sessionResult.user.name,
					image: sessionResult.user.image,
				}
			: null;

		return svelteKitHandler({
			event,
			resolve,
			auth,
			building,
		});
	} catch {
		return resolve(event);
	}
};
