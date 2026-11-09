import { expect, it } from "vitest";
import { getXPostId } from "./get-x-post-id";

it.each([
	"https://x.com/example/status/123",
	"https://twitter.com/example/status/123?ref=foo",
	"https://x.com/i/web/status/123",
	"https://mobile.twitter.com/example/status/123",
	"https://www.x.com/example/status/123",
])("投稿URL %s からIDを取得する", (url) => {
	expect(getXPostId(url)).toBe("123");
});
it.each([
	"https://x.com.evil.example/example/status/123",
	"https://example.com/https://x.com/example/status/123",
	"https://x.com/example",
	"https://x.com/example/status/not-a-number",
])("投稿以外のURL %s は埋め込みにしない", (url) => {
	expect(getXPostId(url)).toBeNull();
});
