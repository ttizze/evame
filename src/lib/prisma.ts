import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { WebSocket } from "ws";

declare global {
	var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL || "";
if (!connectionString) {
	throw new Error("DATABASE_URL is not defined");
}
const isLocalNeon = new URL(connectionString).hostname === "db.localtest.me";

neonConfig.webSocketConstructor = WebSocket;

if (!isLocalNeon) {
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

const adapter = new PrismaNeon({
	connectionString: `${connectionString}?connection_limit=1&pooler=connection-pooler`,
	max: 1,
});

let prismaClient: PrismaClient;

if (isLocalNeon) {
	prismaClient = globalThis.prisma || new PrismaClient({ adapter });
	globalThis.prisma = prismaClient;
} else {
	prismaClient = new PrismaClient({ adapter });
}

export { prismaClient as prisma };
