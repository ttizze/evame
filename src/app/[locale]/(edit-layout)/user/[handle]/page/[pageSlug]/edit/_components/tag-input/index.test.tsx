import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { TagInput } from "./index";
import "@testing-library/jest-dom";

describe("TagInput", () => {
	const mockInitialTags = [{ id: 1, name: "initial" }];
	const mockAllTagsWithCount = [
		{ id: 1, name: "initial", _count: { pages: 1 } },
		{ id: 2, name: "test", _count: { pages: 2 } },
	];
	const mockPageId = 1;

	const user = userEvent.setup();
	// モックの設定
	const mockRequestSubmit = vi.fn();
	global.HTMLFormElement.prototype.requestSubmit = mockRequestSubmit;

	beforeEach(() => {
		mockRequestSubmit.mockClear();
	});

	it("should update tags immediately when creating a new tag", async () => {
		render(
			<TagInput
				allTagsWithCount={mockAllTagsWithCount}
				initialTags={mockInitialTags}
				pageId={mockPageId}
			/>,
		);

		const selectContainer = screen.getByRole("combobox");
		await user.click(selectContainer);
		await user.keyboard("newtag");
		await user.keyboard("{enter}");

		// タグが即座に表示されることを確認
		expect(screen.getByText("newtag")).toBeInTheDocument();

		// フォームのsubmitが呼ばれたことを確認
		expect(mockRequestSubmit).toHaveBeenCalledTimes(1);

		// 表示されているタグの数を確認
		const tags = screen
			.getAllByRole("button")
			.filter((button) => button.classList.contains("hover:text-destructive"));
		expect(tags).toHaveLength(2); // initial + newtag
	});

	it("should not allow more than 5 tags", async () => {
		render(
			<TagInput
				allTagsWithCount={mockAllTagsWithCount}
				initialTags={[
					{ id: 1, name: "tag1" },
					{ id: 2, name: "tag2" },
					{ id: 3, name: "tag3" },
					{ id: 4, name: "tag4" },
					{ id: 5, name: "tag5" },
				]}
				pageId={mockPageId}
			/>,
		);

		// CreatableSelectが非表示になっていることを確認
		const input = screen.queryByPlaceholderText("# Add tags");
		expect(input).not.toBeInTheDocument();
	});

	it("should remove tag when clicking remove button", async () => {
		render(
			<TagInput
				allTagsWithCount={mockAllTagsWithCount}
				initialTags={mockInitialTags}
				pageId={mockPageId}
			/>,
		);

		// 削除ボタンをクリック
		const removeButton = screen.getByRole("button");
		await user.click(removeButton);

		// タグが削除されたことを確認
		expect(screen.queryByText("initial")).not.toBeInTheDocument();

		// フォームのsubmitが呼ばれたことを確認
		expect(mockRequestSubmit).toHaveBeenCalledTimes(1);
	});
	it("should send correct tags to action when creating a new tag", async () => {
		render(
			<TagInput
				allTagsWithCount={mockAllTagsWithCount}
				initialTags={mockInitialTags}
				pageId={mockPageId}
			/>,
		);

		const tagsInput = screen.getByTestId("tags-input") as HTMLInputElement;

		// 初期状態を確認
		expect(JSON.parse(tagsInput.value)).toEqual(["initial"]);

		// 新しいタグを追加
		const selectContainer = screen.getByRole("combobox");
		await user.click(selectContainer);
		await user.keyboard("newtag");
		await user.keyboard("{enter}");

		// UIに新しいタグが表示されることを確認
		expect(screen.getByText("newtag")).toBeInTheDocument();

		// フォームに送信される値が正しいことを確認
		expect(JSON.parse(tagsInput.value)).toEqual(["initial", "newtag"]);

		// さらにもう1つタグを追加
		await user.click(selectContainer);
		await user.keyboard("anothertag");
		await user.keyboard("{enter}");

		// UIに新しいタグが表示されることを確認
		expect(screen.getByText("anothertag")).toBeInTheDocument();

		// フォームに送信される値が正しいことを確認
		expect(JSON.parse(tagsInput.value)).toEqual([
			"initial",
			"newtag",
			"anothertag",
		]);
	});
});
