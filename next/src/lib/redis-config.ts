export const RedisConfig = {
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
};
