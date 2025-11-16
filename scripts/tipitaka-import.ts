#!/usr/bin/env bun
import { Prisma } from "@prisma/client";

import { runTipitakaImport } from "./tipitaka-import/run";

void runTipitakaImport().catch((error) => {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		console.error("Prisma error:", error.message);
	} else {
		console.error(error);
	}
	process.exit(1);
});
