import "@testing-library/jest-dom";
import { afterAll, vi } from "vitest";

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
}));

vi.mock("@/lib/auth-server", () => ({
	getCurrentUser: vi.fn(),
	getSession: vi.fn(),
}));

afterAll(async () => {
	// Prismaの接続を切断する
	// globalThis.__prismaClientが存在する場合のみ（DBを使ったテストの場合のみ）
	if (globalThis.__prismaClient) {
		await globalThis.__prismaClient.$disconnect();
	}
});
