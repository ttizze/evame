import { act, fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, useActionState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockUsers } from "@/tests/mock";
import type { PageWithTitleAndTags } from "../../_db/queries.server";
import { EditPageClient } from "./index";

vi.mock("react-textarea-autosize", () => ({
	default: (props: ComponentProps<"textarea">) => <textarea {...props} />,
}));

vi.mock("../../_hooks/use-keyboard-visible", () => ({
	useKeyboardVisible: () => false,
}));

vi.mock("../editor/editor", () => ({
	Editor: ({ onEditorUpdate }: { onEditorUpdate: () => void }) => (
		<button data-testid="editor-change" onClick={onEditorUpdate} type="button">
			編集
		</button>
	),
}));

vi.mock("../editor/editor-keyboard-menu", () => ({
	EditorKeyboardMenu: () => null,
}));

vi.mock("../header/client", () => ({
	EditHeader: ({
		contentFormId,
		hasUnsavedChanges,
	}: {
		contentFormId: string;
		hasUnsavedChanges: boolean;
	}) => (
		<>
			<div data-testid="save-state">
				{hasUnsavedChanges ? "未保存" : "保存済み"}
			</div>
			<button
				data-testid="save-button"
				disabled={!hasUnsavedChanges}
				form={contentFormId}
				type="submit"
			>
				保存
			</button>
		</>
	),
}));

vi.mock("../tag-input", () => ({
	TagInput: () => null,
}));

vi.mock("./action", () => ({
	editPageContentAction: vi.fn(),
}));

const formAction = vi.fn();
let actionState: { success: boolean; data?: undefined } = { success: false };
let isPending = false;

vi.mock("react", async () => {
	const react = await vi.importActual<typeof import("react")>("react");
	return {
		...react,
		useActionState: vi.fn(() => [actionState, formAction, isPending]),
	};
});

const pageWithTitleAndTags: NonNullable<PageWithTitleAndTags> = {
	id: 1,
	slug: "page",
	createdAt: new Date(),
	sourceLocale: "ja",
	updatedAt: new Date(),
	status: "DRAFT",
	userId: mockUsers[0].id,
	mdastJson: {},
	order: 0,
	parentId: null,
	publishedAt: null,
	archivedAt: null,
	contentId: 1,
	segments: [],
	tagPages: [],
};

const props: ComponentProps<typeof EditPageClient> = {
	currentUser: mockUsers[0],
	pageWithTitleAndTags,
	allTagsWithCount: [],
	initialTitle: "題名",
	pageSlug: "page",
	userLocale: "ja",
	html: "<p>最初の段落</p>",
	targetLocales: [],
	translationContexts: [],
};

describe("EditPageClientの自動保存", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(useActionState).mockClear();
		formAction.mockClear();
		actionState = { success: false };
		isPending = false;
		vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(
			function submitForm(this: HTMLFormElement) {
				fireEvent.submit(this);
			},
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("保存中に編集した内容は保存済みにせず、成功後に再送する", () => {
		const view = render(<EditPageClient {...props} />);

		fireEvent.click(screen.getByTestId("editor-change"));
		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(HTMLFormElement.prototype.requestSubmit).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId("save-state")).toHaveTextContent("未保存");

		isPending = true;
		view.rerender(<EditPageClient {...props} />);
		fireEvent.click(screen.getByTestId("editor-change"));

		isPending = false;
		actionState = { success: true, data: undefined };
		view.rerender(<EditPageClient {...props} />);

		expect(screen.getByTestId("save-state")).toHaveTextContent("未保存");
		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(HTMLFormElement.prototype.requestSubmit).toHaveBeenCalledTimes(2);

		isPending = true;
		view.rerender(<EditPageClient {...props} />);
		isPending = false;
		view.rerender(<EditPageClient {...props} />);

		expect(screen.getByTestId("save-state")).toHaveTextContent("保存済み");
	});

	it("保存アクションが失敗した場合は保存済みと表示しない", () => {
		const view = render(<EditPageClient {...props} />);

		fireEvent.click(screen.getByTestId("editor-change"));
		act(() => {
			vi.advanceTimersByTime(3000);
		});

		isPending = true;
		view.rerender(<EditPageClient {...props} />);
		isPending = false;
		actionState = { success: false };
		view.rerender(<EditPageClient {...props} />);

		expect(screen.getByTestId("save-state")).toHaveTextContent("未保存");
	});

	it("編集直後に手動保存した場合は保留中の自動保存を取り消し、成功後に保存済みと表示する", () => {
		const view = render(<EditPageClient {...props} />);

		fireEvent.click(screen.getByTestId("editor-change"));
		fireEvent.click(screen.getByTestId("save-button"));
		expect(screen.getByTestId("save-state")).toHaveTextContent("未保存");

		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(HTMLFormElement.prototype.requestSubmit).not.toHaveBeenCalled();

		isPending = true;
		view.rerender(<EditPageClient {...props} />);
		isPending = false;
		actionState = { success: true, data: undefined };
		view.rerender(<EditPageClient {...props} />);

		expect(screen.getByTestId("save-state")).toHaveTextContent("保存済み");
	});
});
