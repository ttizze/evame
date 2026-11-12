import { expect, it } from "vitest";
import { postReaderAction } from "./handler";

it("公開ブログ用の入口では記事の公開状態を変更できない", async () => {
	const response = await postReaderAction(
		new Request("https://evame.test/api/reader-actions?action=pageStatus", {
			method: "POST",
			headers: {
				Origin: "https://evame.test",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				pageId: 1,
				locale: "ja",
				operation: "togglePublish",
			}),
		}),
	);
	expect(response.status).toBe(404);
});
