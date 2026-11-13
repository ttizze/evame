import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CommentForm } from "./comment-form";

const session = vi.hoisted(() => ({
	user: null as object | null,
	editorLoads: 0,
}));
vi.mock("@/app/_hooks/use-hydrated", () => ({ useHydrated: () => true }));
vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: { useSession: () => ({ data: { user: session.user } }) },
}));
vi.mock("@/app/[locale]/(common-layout)/_components/start-button", () => ({
	StartButton: () => <button type="button">Start</button>,
}));
vi.mock("use-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/app/[locale]/_components/editor/editor", () => {
	session.editorLoads++;
	return {
		Editor: ({ onChange }: { onChange: (text: string) => void }) => (
			<textarea
				aria-label="コメント"
				onChange={(event) => onChange(event.target.value)}
			/>
		),
	};
});

it("未ログインではエディターを読み込まず、ログイン後は入力して送信できる", async () => {
	const props = { action: vi.fn(), hidden: { pageId: 7 }, isPending: false };
	const { rerender } = render(<CommentForm {...props} />);
	expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
	expect(session.editorLoads).toBe(0);
	session.user = {};
	rerender(<CommentForm {...props} />);
	fireEvent.change(await screen.findByRole("textbox", { name: "コメント" }), {
		target: { value: "保存するコメント" },
	});
	expect(screen.getByRole("button", { name: "post" })).toBeEnabled();
	expect(session.editorLoads).toBe(1);
});
