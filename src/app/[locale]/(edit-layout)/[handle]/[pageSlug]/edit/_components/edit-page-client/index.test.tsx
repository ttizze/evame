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

const { save } = vi.hoisted(() => ({
	save: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("./action", () => ({ editPageContent: save }));
vi.mock("../header/client", () => ({
	EditHeader: ({
		hasUnsavedChanges,
		pageId,
	}: {
		hasUnsavedChanges: boolean;
		pageId: number | undefined;
	}) => (
		<>
			<span data-testid="save-state">
				{hasUnsavedChanges ? "未保存" : "保存済み"}
			</span>
			<button disabled={!pageId} type="button">
				公開
			</button>
		</>
	),
}));
vi.mock("../tag-input", () => ({
	TagInput: ({ pageId }: { pageId: number | undefined }) => (
		<input aria-label="タグ" disabled={!pageId} />
	),
}));
vi.mock("@/app/[locale]/_components/editor/editor", () => ({
	Editor: () => <input name="pageContent" readOnly value="本文" />,
}));
vi.mock("../../_hooks/use-keyboard-visible", () => ({
	useKeyboardVisible: () => false,
}));

const newArticle = (
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
	</IntlProvider>
);

describe("新規記事の保存後の画面", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});
	beforeEach(() => {
		vi.clearAllMocks();
		save.mockResolvedValue({ success: true, data: { pageId: 42 } });
	});
	it("保存中の追加入力を未保存として保ち、先の保存完了後に最新の内容を送る", async () => {
		vi.useFakeTimers();
		const pendingSave = Promise.withResolvers<{
			success: true;
			data: { pageId: number };
		}>();
		save.mockReturnValueOnce(pendingSave.promise);
		const { container, getByTestId } = render(newArticle);
		const form = container.querySelector("form");
		if (!form) throw new Error("フォームがありません");
		fireEvent.submit(form);
		fireEvent.change(getByTestId("title-input"), {
			target: { value: "追加入力" },
		});
		fireEvent.submit(form);
		expect(save).toHaveBeenCalledTimes(1);
		await act(async () => {
			pendingSave.resolve({ success: true, data: { pageId: 42 } });
		});
		expect(getByTestId("save-state")).toHaveTextContent("未保存");
		await act(async () => {
			await vi.advanceTimersByTimeAsync(3000);
		});
		expect(save).toHaveBeenCalledTimes(2);
		expect(save.mock.calls[1][0].data.get("title")).toBe("追加入力");
	});
	it("新規記事を保存したら画面の再取得なしで公開とタグ操作が使える", async () => {
		const { container, getByRole } = render(newArticle);
		const form = container.querySelector("form");
		if (!form) throw new Error("保存フォームがありません");
		expect(getByRole("button", { name: "公開" })).toBeDisabled();
		expect(getByRole("textbox", { name: "タグ" })).toBeDisabled();
		fireEvent.submit(form);
		await waitFor(() => expect(save).toHaveBeenCalledOnce());
		await waitFor(() =>
			expect(getByRole("button", { name: "公開" })).toBeEnabled(),
		);
		expect(getByRole("textbox", { name: "タグ" })).toBeEnabled();
	});
	it("入力直後に保存ボタンを押したら同じ内容を自動保存で再送しない", async () => {
		vi.useFakeTimers();
		const { container, getByTestId } = render(newArticle);
		fireEvent.change(getByTestId("title-input"), {
			target: { value: "手動保存" },
		});
		const form = container.querySelector("form");
		if (!form) throw new Error("保存フォームがありません");
		await act(async () => {
			fireEvent.submit(form);
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(3000);
		});
		expect(save).toHaveBeenCalledOnce();
	});
});
