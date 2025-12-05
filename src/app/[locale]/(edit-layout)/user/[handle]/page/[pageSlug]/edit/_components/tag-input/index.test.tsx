import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editPageTagsAction } from "./action";
import { TagInput } from "./index";

// 外部システムのみモック（Server Action）
vi.mock("./action");

describe("TagInput", () => {
	const mockInitialTags = [{ id: 1, name: "initial" }];
	const mockAllTagsWithCount = [
		{ id: 1, name: "initial", _count: { pages: 1 } },
		{ id: 2, name: "test", _count: { pages: 2 } },
	];
	const mockPageId = 1;

	const user = userEvent.setup();

	beforeEach(() => {
		vi.mocked(editPageTagsAction).mockResolvedValue({
			success: true,
			data: undefined,
		});
	});

	describe("タグ追加", () => {
		it("新しいタグを入力してEnterを押した場合_タグが即座に表示される", async () => {
			// Arrange
			render(
				<TagInput
					allTagsWithCount={mockAllTagsWithCount}
					initialTags={mockInitialTags}
					pageId={mockPageId}
				/>,
			);

			// Act
			const selectContainer = screen.getByRole("combobox");
			await user.click(selectContainer);
			await user.keyboard("newtag");
			await user.keyboard("{enter}");

			// Assert: タグが即座に表示される
			expect(screen.getByText("newtag")).toBeInTheDocument();
			expect(screen.getByText("initial")).toBeInTheDocument();
		});

		it("新しいタグを追加した場合_フォーム送信がトリガーされる", async () => {
			// Arrange
			const mockRequestSubmit = vi.fn();
			global.HTMLFormElement.prototype.requestSubmit = mockRequestSubmit;

			render(
				<TagInput
					allTagsWithCount={mockAllTagsWithCount}
					initialTags={mockInitialTags}
					pageId={mockPageId}
				/>,
			);

			// Act
			const selectContainer = screen.getByRole("combobox");
			await user.click(selectContainer);
			await user.keyboard("newtag");
			await user.keyboard("{enter}");

			// Assert: フォーム送信がトリガーされる
			await waitFor(() => {
				expect(mockRequestSubmit).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("タグ数制限", () => {
		it("タグが5個の場合_追加入力欄が表示されない", () => {
			// Arrange & Act
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

			// Assert: 追加入力欄が非表示
			expect(
				screen.queryByPlaceholderText("# Add tags"),
			).not.toBeInTheDocument();
		});
	});

	describe("タグ削除", () => {
		it("タグの削除ボタンをクリックした場合_タグが削除される", async () => {
			// Arrange
			render(
				<TagInput
					allTagsWithCount={mockAllTagsWithCount}
					initialTags={mockInitialTags}
					pageId={mockPageId}
				/>,
			);

			// Act: 削除ボタンをクリック（Xアイコンのボタン）
			const removeButtons = screen
				.getAllByRole("button")
				.filter((button) =>
					button.classList.contains("hover:text-destructive"),
				);
			await user.click(removeButtons[0]);

			// Assert: タグが削除される
			await waitFor(() => {
				expect(screen.queryByText("initial")).not.toBeInTheDocument();
			});
		});

		it("タグを削除した場合_フォーム送信がトリガーされる", async () => {
			// Arrange
			const mockRequestSubmit = vi.fn();
			global.HTMLFormElement.prototype.requestSubmit = mockRequestSubmit;

			render(
				<TagInput
					allTagsWithCount={mockAllTagsWithCount}
					initialTags={mockInitialTags}
					pageId={mockPageId}
				/>,
			);

			// Act
			const removeButtons = screen
				.getAllByRole("button")
				.filter((button) =>
					button.classList.contains("hover:text-destructive"),
				);
			await user.click(removeButtons[0]);

			// Assert: フォーム送信がトリガーされる
			await waitFor(() => {
				expect(mockRequestSubmit).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("複数タグの管理", () => {
		it("複数のタグを追加した場合_すべてのタグが表示される", async () => {
			// Arrange
			render(
				<TagInput
					allTagsWithCount={mockAllTagsWithCount}
					initialTags={mockInitialTags}
					pageId={mockPageId}
				/>,
			);

			// Act: 1つ目のタグを追加
			const selectContainer = screen.getByRole("combobox");
			await user.click(selectContainer);
			await user.keyboard("newtag");
			await user.keyboard("{enter}");

			// 2つ目のタグを追加
			await user.click(selectContainer);
			await user.keyboard("anothertag");
			await user.keyboard("{enter}");

			// Assert: すべてのタグが表示される
			expect(screen.getByText("initial")).toBeInTheDocument();
			expect(screen.getByText("newtag")).toBeInTheDocument();
			expect(screen.getByText("anothertag")).toBeInTheDocument();
		});
	});
});
