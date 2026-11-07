import { expect, it } from "vitest";
import { readerCacheTags } from "./reader-cache-tags";

it("日本語や区切り文字を含むキーをCloudflareで使える一定長のタグへ変換する", async () => {
	const keys = ["tag:日本語,タグ", "author:User", "author:user", "page:1"];
	const tags = await readerCacheTags(keys);
	expect(tags).toEqual(await readerCacheTags(keys));
	expect(new Set(tags).size).toBe(4);
	for (const tag of tags) expect(tag).toMatch(/^reader:[a-f0-9]{64}$/);
	expect(await readerCacheTags(["page:1", "page:1"])).toHaveLength(1);
});
