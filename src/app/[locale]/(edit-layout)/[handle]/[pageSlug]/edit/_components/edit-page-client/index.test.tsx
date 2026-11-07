import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
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
vi.mock("../header/client", () => ({
	EditHeader: ({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) => (
		<span data-testid="save-state">
			{hasUnsavedChanges ? "未保存" : "保存済み"}
		</span>
	),
}));
vi.mock("../tag-input", () => ({ TagInput: () => null }));
vi.mock("@/app/[locale]/_components/editor/editor", () => ({
	Editor: () => <input name="pageContent" readOnly value="本文" />,
}));
vi.mock("../../_hooks/use-keyboard-visible", () => ({
	useKeyboardVisible: () => false,
}));

describe("新規記事の保存後の画面", () => {
	afterEach(cleanup);
	beforeEach(() => {
		vi.clearAllMocks();
		save.mockResolvedValue({ success: true });
	});
	it("保存中の追加入力を未保存として保ち、先の保存完了後に最新の内容を送る", async () => {
		let complete: ((value: { success: true }) => void) | null = null;
		save.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					complete = resolve;
				}),
		);
		const { container, getByTestId } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<EditPageClient
					allTagsWithCount={[]}
					currentUser={mockUsers[0]}
					handle={mockUsers[0].handle}
					initialTitle="初回"
					markdown=""
					pageSlug="new-article"
					pageWithTitleAndTags={null}
					targetLocales={[]}
					translationContexts={[]}
					userLocale="ja"
				/>
			</IntlProvider>,
		);
		const form = container.querySelector("form");
		if (!form) throw new Error("フォームがありません");
		fireEvent.submit(form);
		fireEvent.change(getByTestId("title-input"), {
			target: { value: "追加入力" },
		});
		fireEvent.submit(form);
		expect(save).toHaveBeenCalledTimes(1);
		await act(async () => {
			complete?.({ success: true });
		});
		expect(getByTestId("save-state")).toHaveTextContent("未保存");
		fireEvent.submit(form);
		await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
		expect(save.mock.calls[1][0].data.get("title")).toBe("追加入力");
	});
	it("保存成功後にloaderを更新し、公開操作に必要な記事IDを読み直す", async () => {
		const { container } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<EditPageClient
					allTagsWithCount={[]}
					currentUser={mockUsers[0]}
					handle={mockUsers[0].handle}
					initialTitle="新しい記事"
					markdown=""
					pageSlug="new-article"
					pageWithTitleAndTags={null}
					targetLocales={[]}
					translationContexts={[]}
					userLocale="ja"
				/>
			</IntlProvider>,
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
