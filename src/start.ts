import { env } from "cloudflare:workers";
import { captureException } from "@sentry/cloudflare";
import { isRedirect } from "@tanstack/react-router";
import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";
import { getMaintenancePath, shouldCheckMaintenance } from "./maintenance-gate";

export const maintenanceMiddleware = createMiddleware().server(
	async ({ next, pathname, request }) => {
		if (!shouldCheckMaintenance(pathname)) return next();

		const isOn = await env.SETTINGS.get<boolean>("maintenance", "json");
		if (!isOn) return next();

		const maintenanceUrl = new URL(
			getMaintenancePath({
				pathname,
				cookieHeader: request.headers.get("cookie"),
				acceptLanguage: request.headers.get("accept-language"),
			}),
			request.url,
		);
		return Response.redirect(maintenanceUrl, 307);
	},
);
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
	requestMiddleware: [csrfMiddleware, maintenanceMiddleware],
	functionMiddleware: [sentryMiddleware],
}));
