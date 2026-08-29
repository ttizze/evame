import {
	sentryGlobalFunctionMiddleware,
	sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";
import { get } from "@vercel/edge-config";
import { getMaintenancePath, shouldCheckMaintenance } from "./maintenance-gate";

export const maintenanceMiddleware = createMiddleware().server(
	async ({ next, pathname, request }) => {
		if (!shouldCheckMaintenance(pathname)) return next();

		// Edge Config障害は既存proxyと同じく上位のエラーハンドラへ伝播させる。
		const isOn = await get<boolean>("maintenance");
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

export const startInstance = createStart(() => ({
	requestMiddleware: [
		sentryGlobalRequestMiddleware,
		csrfMiddleware,
		maintenanceMiddleware,
	],
	functionMiddleware: [sentryGlobalFunctionMiddleware],
}));
