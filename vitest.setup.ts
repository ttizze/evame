import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("@/app/_service/auth-server", () => ({
	getCurrentUser: vi.fn(),
	getSession: vi.fn(),
}));
