import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { WebSocket } from "ws";
import { EventEmitter } from "node:events";

declare global {
	// Reuse singletons in dev/hot-reload to avoid accumulating listeners
	// eslint-disable-next-line no-var
	var prisma: PrismaClient | undefined;
	// eslint-disable-next-line no-var
	var prismaAdapter: PrismaNeon | undefined;
}

const connectionString = process.env.DATABASE_URL || "";
if (!connectionString) {
	throw new Error("DATABASE_URL is not defined");
}
const isLocalNeon = new URL(connectionString).hostname === "db.localtest.me";

if (isLocalNeon) {
	neonConfig.webSocketConstructor = WebSocket;
	neonConfig.poolQueryViaFetch = true;
}
if (isLocalNeon) {
	const getLocalPort = () => (process.env.NODE_ENV === "test" ? 4445 : 4444);
	neonConfig.fetchEndpoint = (host) => {
		return `http://${host}:${getLocalPort()}/sql`;
	};
	neonConfig.useSecureWebSocket = false;
	neonConfig.wsProxy = (host) => {
		return `${host}:${getLocalPort()}/v2`;
	};
}

// Workaround dev warning from accumulating connection 'error' listeners
// in @prisma/adapter-neon during repeated transactions.
if (process.env.NODE_ENV !== "production") {
	// Disable listener leak warnings in dev; adapter adds per-tx listeners
	EventEmitter.defaultMaxListeners = 0;
}

// Ensure a single adapter instance during dev/HMR (only when using Neon adapter)
const adapter = isLocalNeon
	? globalThis.prismaAdapter ||
		new PrismaNeon(
			{
				connectionString: isLocalNeon
					? connectionString
					: `${connectionString}?pooler=connection-pooler&connection_limit=1`,
				// Local dev: larger pool to avoid reusing a single connection endlessly
				max: Number(process.env.NEON_POOL_MAX ?? (isLocalNeon ? "10" : "1")),
			},
			{
				schema: process.env.PG_SCHEMA,
				onPoolError: (err) => {
					// eslint-disable-next-line no-console
					console.error("[neon] pool error:", err);
				},
				onConnectionError: (err) => {
					// eslint-disable-next-line no-console
					console.error("[neon] connection error:", err);
				},
			},
		)
	: undefined;

// Create or reuse a single PrismaClient instance
const prismaClient =
	globalThis.prisma ||
	(isLocalNeon ? new PrismaClient({ adapter }) : new PrismaClient());

// Cache instances in dev to prevent EventEmitter listener leaks
if (process.env.NODE_ENV !== "production") {
	if (adapter) globalThis.prismaAdapter = adapter;
	globalThis.prisma = prismaClient;
}

export { prismaClient as prisma };
