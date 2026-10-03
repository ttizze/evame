import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockUsers } from "@/tests/mock";
import { EditPageClient } from "./index";

const { invalidate, save } = vi.hoisted(() => ({
	invalidate: vi.fn().mockResolvedValue(undefined),
	save: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("./action", () => ({ editPageContent: save }));
vi.mock("../header/client", () => ({ EditHeader: () => null }));
vi.mock("../tag-input", () => ({ TagInput: () => null }));
vi.mock("../editor/editor", () => ({
	Editor: () => <input name="pageContent" readOnly value="<p>本文</p>" />,
}));
vi.mock("../editor/editor-keyboard-menu", () => ({
	EditorKeyboardMenu: () => null,
}));
vi.mock("../../_hooks/use-keyboard-visible", () => ({
	useKeyboardVisible: () => false,
}));

describe("新規記事の保存後の画面", () => {
	it("保存成功後にloaderを更新し、公開操作に必要な記事IDを読み直す", async () => {
		const { container } = render(
			<EditPageClient
				allTagsWithCount={[]}
				currentUser={mockUsers[0]}
				handle={mockUsers[0].handle}
				html=""
				initialTitle="新しい記事"
				pageSlug="new-article"
				pageWithTitleAndTags={null}
				targetLocales={[]}
				translationContexts={[]}
				userLocale="ja"
			/>,
		);
		const form = container.querySelector("form");
		if (!form) throw new Error("保存フォームがありません");
		fireEvent.submit(form);
		await waitFor(() => expect(save).toHaveBeenCalledOnce());
		await waitFor(() =>
			expect(invalidate).toHaveBeenCalledWith({ sync: true }),
		);
	});
});
