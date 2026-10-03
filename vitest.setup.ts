import "@testing-library/jest-dom/vitest";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { vi } from "vitest";

// jest-domのVitest用宣言は旧Assertion API向けのため、Vitest 5のMatchersを拡張する。
declare module "vitest" {
	interface Matchers<R extends void | Promise<void>, T>
		extends TestingLibraryMatchers<T, R> {}
}

vi.mock("@/app/_service/auth-server", () => ({
	getCurrentUser: vi.fn(),
	getSession: vi.fn(),
}));
