import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import type { EditPageTagsActionState } from "./action";
import { TagInput } from "./index";

const wrapper = ({ children }: { children: ReactNode }) => (
	<IntlProvider locale="en" messages={messages.en}>
		{children}
	</IntlProvider>
);

const defaultProps = {
	allTagsWithCount: [
		{ id: 1, name: "initial", _count: { pages: 1 } },
		{ id: 2, name: "test", _count: { pages: 2 } },
	],
	editState: { success: true, data: undefined } as EditPageTagsActionState,
	isSaving: false,
	onRetry: vi.fn(),
	onTagsChange: vi.fn(),
	pageId: 1,
	tags: ["initial"],
};

beforeEach(() => {
	defaultProps.onRetry.mockReset();
	defaultProps.onTagsChange.mockReset();
});

describe("TagInput", () => {
	it("タグを入力してEnterを押すと表示中のタグに追加して保存を依頼する", async () => {
		const user = userEvent.setup();
		render(<TagInput {...defaultProps} />, { wrapper });
		await user.click(screen.getByRole("combobox", { name: "Tags" }));
		await user.keyboard("newtag");
		expect(
			screen.getByRole("option", { name: "Create tag “newtag”" }),
		).toBeInTheDocument();
		await user.keyboard("{Enter}");
		expect(defaultProps.onTagsChange).toHaveBeenCalledWith([
			"initial",
			"newtag",
		]);
	});

	it("既存のタグ候補を選ぶとタグの件数ではなく名前を追加する", async () => {
		const user = userEvent.setup();
		render(<TagInput {...defaultProps} />, { wrapper });
		await user.click(screen.getByRole("combobox", { name: "Tags" }));
		expect(
			screen.queryByRole("option", { name: "initial (1)" }),
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("option", { name: "test (2)" }));
		expect(defaultProps.onTagsChange).toHaveBeenCalledWith(["initial", "test"]);
	});

	it("追加済みのタグと同じ名前を入力しても重複させない", async () => {
		const user = userEvent.setup();
		render(<TagInput {...defaultProps} />, { wrapper });
		await user.click(screen.getByRole("combobox", { name: "Tags" }));
		await user.keyboard("initial{Enter}");
		expect(defaultProps.onTagsChange).not.toHaveBeenCalled();
	});

	it("タグが5個のときは追加入力を隠して各タグの削除を維持する", () => {
		render(
			<TagInput
				{...defaultProps}
				tags={["tag1", "tag2", "tag3", "tag4", "tag5"]}
			/>,
			{ wrapper },
		);
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: /Remove tag/ })).toHaveLength(
			5,
		);
	});

	it("タグの削除ボタンを押すと対象だけを除いた一覧の保存を依頼する", async () => {
		const user = userEvent.setup();
		render(<TagInput {...defaultProps} tags={["initial", "test"]} />, {
			wrapper,
		});
		await user.click(
			screen.getByRole("button", { name: "Remove tag initial" }),
		);
		expect(defaultProps.onTagsChange).toHaveBeenCalledWith(["test"]);
	});

	it("最後のタグを削除すると空のタグ一覧の保存を依頼する", async () => {
		const user = userEvent.setup();
		render(<TagInput {...defaultProps} />, { wrapper });
		await user.click(
			screen.getByRole("button", { name: "Remove tag initial" }),
		);
		expect(defaultProps.onTagsChange).toHaveBeenCalledWith([]);
	});

	it.each([
		{ isSaving: true, pageId: 1 },
		{ isSaving: false, pageId: undefined },
	])(
		"保存中または記事IDのないときに追加と削除を受け付けない（%j）",
		async (props) => {
			const user = userEvent.setup();
			render(<TagInput {...defaultProps} {...props} />, { wrapper });
			expect(
				screen.getByLabelText("Tags", { selector: "input" }),
			).toBeDisabled();
			const remove = screen.getByRole("button", { name: "Remove tag initial" });
			expect(remove).toBeDisabled();
			await user.click(remove);
			expect(defaultProps.onTagsChange).not.toHaveBeenCalled();
		},
	);

	it("保存失敗を表示し、再試行ボタンで保存を依頼する", async () => {
		const user = userEvent.setup();
		render(<TagInput {...defaultProps} editState={{ success: false }} />, {
			wrapper,
		});
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Could not save tags. Please try again.",
		);
		await user.click(screen.getByRole("button", { name: "Retry saving tags" }));
		expect(defaultProps.onRetry).toHaveBeenCalledOnce();
	});

	it.each([
		[
			{ tags: ["symbol and space can not be used"] },
			"Use 1–15 characters per tag, without spaces or symbols, and up to 5 tags.",
		],
		[{ pageId: ["Too small"] }, "Page not found."],
	])(
		"APIの入力エラーを英語の生データではなく翻訳した説明で表示する（%j）",
		(zodErrors, expected) => {
			render(
				<TagInput
					{...defaultProps}
					editState={{ success: false, zodErrors }}
				/>,
				{ wrapper },
			);
			expect(screen.getByRole("alert")).toHaveTextContent(expected);
			expect(
				screen.queryByText("symbol and space can not be used"),
			).not.toBeInTheDocument();
		},
	);

	it.each([
		[
			"ja",
			"タグ",
			"タグを追加",
			"タグ「initial」を削除",
			"タグを保存できませんでした。もう一度お試しください。",
		],
		[
			"en",
			"Tags",
			"Add tags",
			"Remove tag initial",
			"Could not save tags. Please try again.",
		],
		[
			"es",
			"Etiquetas",
			"Añadir etiquetas",
			"Eliminar etiqueta initial",
			"No se pudieron guardar las etiquetas. Inténtalo de nuevo.",
		],
		["zh", "标签", "添加标签", "移除标签initial", "无法保存标签，请重试。"],
		[
			"ko",
			"태그",
			"태그 추가",
			"태그 initial 삭제",
			"태그를 저장하지 못했습니다. 다시 시도해 주세요.",
		],
	] as const)(
		"%sのタグ名・追加・削除・保存失敗を各言語で表示する",
		(locale, title, placeholder, remove, failure) => {
			render(
				<IntlProvider locale={locale} messages={messages[locale]}>
					<TagInput {...defaultProps} editState={{ success: false }} />
				</IntlProvider>,
			);
			expect(screen.getByRole("combobox", { name: title })).toBeInTheDocument();
			expect(screen.getByText(placeholder)).toBeInTheDocument();
			expect(screen.getByRole("button", { name: remove })).toBeInTheDocument();
			expect(screen.getByRole("alert")).toHaveTextContent(failure);
		},
	);
});
