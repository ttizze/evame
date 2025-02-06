import { PrismaClient } from "@prisma/client";
export const oldPrisma = new PrismaClient({
	datasources: {
		db: { url: process.env.OLD_DATABASE_URL },
	},
});

export const newPrisma = new PrismaClient({
	datasources: {
		db: { url: process.env.NEW_DATABASE_URL },
	},
});
