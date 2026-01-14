import pino from "pino";

const resolveLogLevel = () => {
	const configured = process.env.LOG_LEVEL;
	if (configured) return configured;
	if (process.env.VITEST || process.env.NODE_ENV === "test") return "error";
	if (process.env.CI) return "warn";
	if (process.env.NODE_ENV === "production") return "info";
	return "debug";
};

export const createLogger = (service: string) => {
	const level = resolveLogLevel();
	const isDev = process.env.NODE_ENV !== "production";

	return pino({
		level,
		name: service,
		transport: isDev
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:standard",
						ignore: "pid,hostname",
					},
				}
			: undefined,
	});
};
