import { expect, it } from "vitest";
import { formSchema } from "./form-schema";

it.each(["", " \r\n\t "])("空の題名 %j はuntitledとして保存する", (title) => {
	expect(
		formSchema.parse({
			pageSlug: "article",
			userLocale: "ja",
			title,
			pageContent: "本文",
			contentFormat: "markdown",
		}).title,
	).toBe("untitled");
});

it("入力済みの題名は共通の正規化と文字数検証を維持する", () => {
	const form = {
		pageSlug: "article",
		userLocale: "ja",
		title: " 題名\n続き ",
		pageContent: "本文",
	};
	expect(formSchema.parse(form).title).toBe("題名 続き");
	expect(
		formSchema.safeParse({ ...form, title: "あ".repeat(101) }).success,
	).toBe(false);
	expect(formSchema.safeParse({ ...form, title: null }).success).toBe(false);
});
