import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editPageTags } from "./action";
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
		vi.mocked(editPageTags).mockReset().mockResolvedValue({
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

		it("新しいタグを追加すると更新関数へ最新タグを渡す", async () => {
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

			await waitFor(() => {
				expect(editPageTags).toHaveBeenCalledTimes(1);
			});
			const request = vi.mocked(editPageTags).mock.calls[0]?.[0];
			expect(request?.data).toBeInstanceOf(FormData);
			if (!(request?.data instanceof FormData)) {
				throw new Error("タグ更新の入力がFormDataではありません");
			}
			expect(request.data.get("tags")).toBe('["initial","newtag"]');
		});
	});

	describe("タグ数制限", () => {
		it("タグが5個の場合_追加入力欄が表示されない", () => {
			// Arrange & Act
			render(
				<TagInput
					allTagsWithCount={mockAllTagsWithCount}
					initialTags={[
						{ name: "tag1" },
						{ name: "tag2" },
						{ name: "tag3" },
						{ name: "tag4" },
						{ name: "tag5" },
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

		it("タグを削除すると更新関数へ空のタグ一覧を渡す", async () => {
			render(
				<TagInput
					allTagsWithCount={mockAllTagsWithCount}
					initialTags={mockInitialTags}
					pageId={mockPageId}
				/>,
			);

			const removeButtons = screen
				.getAllByRole("button")
				.filter((button) =>
					button.classList.contains("hover:text-destructive"),
				);
			await user.click(removeButtons[0]);

			await waitFor(() => {
				expect(editPageTags).toHaveBeenCalledTimes(1);
			});
			const request = vi.mocked(editPageTags).mock.calls[0]?.[0];
			expect(request?.data).toBeInstanceOf(FormData);
			if (!(request?.data instanceof FormData)) {
				throw new Error("タグ更新の入力がFormDataではありません");
			}
			expect(request.data.get("tags")).toBe("[]");
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
