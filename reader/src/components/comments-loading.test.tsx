import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CommentsIsland } from "./comments";

vi.mock("./toaster.client", () => ({ acquireToaster: () => () => {} }));

const list = vi.hoisted(() => ({ loads: 0 }));
vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-list/server",
	() => {
		list.loads++;
		return { PageCommentList: () => <p>取得したコメント</p> };
	},
);
vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-form/client",
	() => ({ PageCommentForm: () => <div>コメント入力</div> }),
);

it("コメントがない間は本文変換を読み込まず、投稿後に一覧を表示できる", async () => {
	let complete!: (response: Response) => void;
	vi.stubGlobal(
		"fetch",
		vi.fn().mockReturnValue(
			new Promise((resolve) => {
				complete = resolve;
			}),
		),
	);
	render(
		<CommentsIsland
			initialData={{
				comments: [],
				count: 0,
				totalPages: 0,
				commentsEnabled: true,
			}}
			initialList={null}
			initialPage={1}
			locale="ja"
			pageId={7}
			pathname="/ja/alice/notes"
			search=""
		/>,
	);
	expect(screen.getByText("コメント入力")).toBeInTheDocument();
	expect(list.loads).toBe(0);
	complete(
		Response.json({
			comments: [{}],
			count: 1,
			totalPages: 1,
			commentsEnabled: true,
		}),
	);
	expect(await screen.findByText("取得したコメント")).toBeInTheDocument();
	expect(list.loads).toBe(1);
	vi.unstubAllGlobals();
});
