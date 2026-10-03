import { csrfSymbol } from "@tanstack/react-start";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readMaintenance } = vi.hoisted(() => ({
	readMaintenance: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
	env: { SETTINGS: { get: readMaintenance } },
}));

import {
	maintenanceMiddleware,
	sentryMiddleware,
	startInstance,
} from "./start";

type MaintenanceMiddlewareContext = Parameters<
	NonNullable<typeof maintenanceMiddleware.options.server>
>[0];

async function runMiddleware(
	pathname: string,
	headers?: Record<string, string>,
) {
	const request = new Request(`https://evame.test${pathname}`, { headers });
	const response = new Response("next");
	const next = vi.fn();
	const nextMiddleware: MaintenanceMiddlewareContext["next"] = <
		TServerContext = undefined,
	>(options?: {
		context?: TServerContext;
	}) => {
		next(options);
		return {
			request,
			pathname,
			context: options?.context as never,
			response,
		};
	};
	const context: MaintenanceMiddlewareContext = {
		request,
		pathname,
		context: undefined,
		handlerType: "router",
		next: nextMiddleware,
	};

	const result = await maintenanceMiddleware.options.server?.(context);
	return { next, response, result };
}

describe("TanStack Startのメンテナンスrequest middleware", () => {
	beforeEach(() => {
		readMaintenance.mockReset();
	});

	it("Server FunctionのSentry監視と、maintenanceより前のCSRF検証を登録する", async () => {
		const options = await startInstance.getOptions();
		const [csrfMiddleware, registeredMaintenanceMiddleware] =
			options.requestMiddleware ?? [];

		expect(options.functionMiddleware).toEqual([sentryMiddleware]);
		expect(csrfMiddleware).toBeDefined();
		if (!csrfMiddleware) {
			throw new Error("CSRF middlewareが登録されていません");
		}
		expect(csrfSymbol in csrfMiddleware).toBe(true);
		expect(registeredMaintenanceMiddleware).toBe(maintenanceMiddleware);
	});

	it("APIやstaticなどのmatcher除外パスはKVを読まずに通過する", async () => {
		const { next, response, result } = await runMiddleware("/api/auth/session");

		expect(readMaintenance).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledOnce();
		expect(result).toMatchObject({ response });
	});

	it("maintenance route自身はKVを読まずに通過する", async () => {
		const { next, response, result } = await runMiddleware("/ja/maintenance");

		expect(readMaintenance).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledOnce();
		expect(result).toMatchObject({ response });
	});

	it("flagが無効なら通常のrequest処理へ進む", async () => {
		readMaintenance.mockResolvedValue(false);

		const { next, response, result } = await runMiddleware("/ja/about");

		expect(readMaintenance).toHaveBeenCalledWith("maintenance", "json");
		expect(next).toHaveBeenCalledOnce();
		expect(result).toMatchObject({ response });
	});

	it("flagが有効ならlocale付きmaintenanceへ307 redirectする", async () => {
		readMaintenance.mockResolvedValue(true);

		const { next, result } = await runMiddleware("/about", {
			"accept-language": "ja-JP, en;q=0.8",
		});

		expect(next).not.toHaveBeenCalled();
		expect(result).toBeInstanceOf(Response);
		if (!(result instanceof Response)) {
			throw new Error("maintenance redirectがResponseではありません");
		}
		expect(result.status).toBe(307);
		expect(result.headers.get("location")).toBe(
			"https://evame.test/ja/maintenance",
		);
	});

	it("KV障害時は既存どおりrequestを失敗させる", async () => {
		const failure = new Error("KV unavailable");
		readMaintenance.mockRejectedValue(failure);

		await expect(runMiddleware("/about")).rejects.toBe(failure);
	});
});
