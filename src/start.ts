import { captureException } from "@sentry/cloudflare";
import { isRedirect } from "@tanstack/react-router";
import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
	filter: ({ handlerType }) => handlerType === "serverFn",
});

export const sentryMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		try {
			return await next();
		} catch (error) {
			if (!isRedirect(error)) captureException(error);
			throw error;
		}
	},
);

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware],
	functionMiddleware: [sentryMiddleware],
}));
