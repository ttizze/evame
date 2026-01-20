import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(() => "/"),
	useSearchParams: vi.fn(() => new URLSearchParams()),
	useParams: vi.fn(() => ({})),
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	})),
	redirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`);
	}),
	permanentRedirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`);
	}),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
	revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
	revalidateTag: vi.fn(),
	updateTag: vi.fn(),
}));

vi.mock("@/app/_service/auth-server", () => ({
	getCurrentUser: vi.fn(),
	getSession: vi.fn(),
}));
