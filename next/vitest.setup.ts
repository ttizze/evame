import { vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
	// @ts-ignore
	prisma: vPrisma.client,
}));
