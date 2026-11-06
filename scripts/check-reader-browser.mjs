import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

export async function checkReaderBrowser(baseUrl, cookie, handle, pageSlug) {
	const browser = await chromium.launch();
	try {
		const noScript = await browser.newContext({ javaScriptEnabled: false });
		const staticPage = await noScript.newPage();
		await staticPage.goto(`${baseUrl}/ja`);
		await expect(
			staticPage.getByRole("heading", { name: "新着記事", exact: true }),
		).toBeVisible();
		await expect(
			staticPage.getByRole("link", { name: "Workers保存テスト" }).first(),
		).toBeVisible();
		await staticPage.goto(`${baseUrl}/ja/${handle}/${pageSlug}?view=both`);
		await expect(
			staticPage.getByRole("heading", { name: "Workers保存テスト" }),
		).toBeVisible();
		await expect(
			staticPage
				.locator("article")
				.getByText("Cloudflareで更新保存", { exact: true }),
		).toBeVisible();
		await expect(staticPage.locator("body")).toHaveAttribute(
			"data-view",
			"both",
		);
		await expect(
			staticPage
				.locator('[data-tweet-id="123456789"]')
				.getByRole("link", { name: "X", exact: true }),
		).toBeVisible();
		await staticPage.goto(
			`${baseUrl}/ja/${handle}/${pageSlug}?page=2#comments`,
		);
		await expect(
			staticPage
				.locator("#comments")
				.getByText("comment-marker-21", { exact: true }),
		).toBeVisible();
		await noScript.close();
		console.log("JavaScript無効でも記事一覧・本文・表示モードを読める");
		const context = await browser.newContext();
		await context.route("**/*", (route) =>
			new URL(route.request().url()).origin === baseUrl
				? route.continue()
				: route.abort(),
		);
		const separator = cookie.indexOf("=");
		await context.addCookies([
			{
				name: cookie.slice(0, separator),
				value: cookie.slice(separator + 1),
				url: baseUrl,
				httpOnly: true,
				sameSite: "Lax",
			},
		]);
		const page = await context.newPage();
		const errors = [];
		page.on("pageerror", (error) => errors.push(error.message));
		page.on("console", (message) => {
			if (
				message.type() === "error" &&
				/Minified React error|hydration|Hydration/.test(message.text())
			)
				errors.push(message.text());
		});
		await page.goto(`${baseUrl}/ja`);
		await expect(
			page.getByRole("button", { name: "Create a new page" }),
		).toBeVisible();
		await expect(page.locator("#about-section")).toHaveCount(0);
		await page.getByRole("button", { name: "Create a new page" }).click();
		await page.waitForURL(/\/edit$/);
		await page.getByTestId("title-input").fill("ブラウザー新規保存");
		const editor = page.locator(".tiptap[contenteditable=true]");
		await editor.fill("Tiptapのブラウザー入力を保存する");
		await expect
			.poll(
				async () => {
					const response = await page.request.get(
						page.url().replace(/\/edit$/, ""),
					);
					return response.text();
				},
				{ timeout: 20000 },
			)
			.toContain("Tiptapのブラウザー入力を保存する");
		console.log(
			"ログイン済みトップから新規ページを開き、Tiptapで入力した本文を保存できる",
		);
		await page.goto(
			`${baseUrl}/ja/${handle}/${pageSlug}?page=2&view=both#comments`,
		);
		const commentPages = page.locator("#comments");
		await expect(
			commentPages.getByText("comment-marker-21", { exact: true }),
		).toBeVisible();
		await expect(
			commentPages.locator(".tiptap[contenteditable=true]").first(),
		).toBeVisible();
		await commentPages.getByRole("link", { name: "前のコメント" }).click();
		await expect(
			commentPages.getByText("comment-marker-01", { exact: true }),
		).toBeVisible();
		await commentPages.getByRole("link", { name: "次のコメント" }).click();
		await expect(
			commentPages.getByText("comment-marker-21", { exact: true }),
		).toBeVisible();
		await expect(page).toHaveURL(/page=2/);
		await page.reload();
		await expect(
			commentPages.getByText("comment-marker-21", { exact: true }),
		).toBeVisible();
		console.log(
			"コメントの2ページ目を直接開いて往復・再読み込みしても、URLと本文が一致する",
		);
		await page.goto(`${baseUrl}/ja/${handle}/${pageSlug}-child`);
		await page.getByRole("button", { name: "page tree", exact: true }).click();
		await expect(
			page.getByRole("navigation", { name: "Page tree" }),
		).toBeVisible();
		await expect(
			page
				.getByRole("navigation", { name: "Page tree" })
				.getByRole("link", { name: "Workers保存テスト" })
				.first(),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await page.goto(`${baseUrl}/ja/${handle}/${pageSlug}`);
		await expect(
			page.locator('[data-tweet-id="123456789"]').getByText("Tweet not found"),
		).toBeVisible({ timeout: 15000 });
		const like = page
			.getByRole("button", { name: "Like", exact: true })
			.first();
		await like.scrollIntoViewIfNeeded();
		const liked = page.waitForResponse(
			(r) =>
				r.url().includes("reader-actions?action=like") &&
				r.request().method() === "POST",
		);
		await like.click();
		assert.equal((await liked).status(), 200);
		await expect(like.locator("svg")).toHaveAttribute("fill", "currentColor");
		const comments = page.locator("#comments");
		await comments.scrollIntoViewIfNeeded();
		const commentEditor = comments
			.locator(".tiptap[contenteditable=true]")
			.first();
		await commentEditor.fill("ブラウザーからコメントを投稿");
		const posted = page.waitForResponse(
			(r) =>
				r.url().includes("reader-actions?action=comment") &&
				r.request().method() === "POST",
		);
		await comments
			.getByRole("button", { name: "post", exact: true })
			.first()
			.click();
		const postedResponse = await posted;
		assert.equal(postedResponse.status(), 200);
		await expect(
			comments.getByText("ブラウザーからコメントを投稿", { exact: true }),
		).toBeVisible({ timeout: 15000 });
		await expect(page).toHaveURL(/page=2/);
		console.log(
			"Astro記事のいいねとコメント投稿が動き、コメントの2ページ目へ更新できる",
		);
		await comments
			.getByRole("button", { name: /^Reply/ })
			.first()
			.click();
		await comments
			.locator(".tiptap[contenteditable=true]")
			.nth(1)
			.fill("ブラウザーから返信する");
		const replied = page.waitForResponse(
			(r) =>
				r.url().includes("reader-actions?action=comment") &&
				r.request().method() === "POST",
		);
		await comments
			.getByRole("button", { name: "post", exact: true })
			.nth(1)
			.click();
		assert.equal((await replied).status(), 200);
		await expect(
			comments.getByText("ブラウザーから返信する", { exact: true }),
		).toBeVisible();
		for (const [position, text] of [
			["first", "comment-marker-21"],
			["last", "ブラウザーからコメントを投稿"],
		]) {
			await comments
				.getByRole("button", { name: "More options" })
				[position]()
				.click();
			const deleted = page.waitForResponse(
				(r) =>
					r.url().includes("reader-actions?action=deleteComment") &&
					r.request().method() === "POST",
			);
			await page.getByText("Delete", { exact: true }).click();
			assert.equal((await deleted).status(), 200);
			await expect(
				comments.locator(".seg-src").filter({ hasText: text }),
			).toHaveCount(0);
			await expect(
				page.getByRole("menuitem").filter({ hasText: "Delete" }),
			).toHaveCount(0);
			await expect(
				comments.getByText("ブラウザーから返信する", { exact: true }),
			).toBeVisible();
		}
		await page.goto(`${baseUrl}/en/${handle}/${pageSlug}?view=both`);
		await expect(page.locator("body")).toHaveAttribute("data-view", "both");
		const changeView = page.getByRole("button", {
			name: "Currently: Both languages (Click to change)",
		});
		await page
			.locator('astro-island[component-export="ControlsIsland"]:not([ssr])')
			.waitFor({ state: "attached" });
		await changeView.click();
		await expect(page.locator("body")).toHaveAttribute("data-view", "user");
		const segment = page.locator("article .js-content .seg-tr").first();
		await page
			.locator('astro-island[component-export="TranslationsIsland"]:not([ssr])')
			.waitFor({ state: "attached" });
		await segment.press("Enter");
		const translation = page.getByPlaceholder("Or enter your translation...");
		await translation.fill("ブラウザーから翻訳を追加");
		const translated = page.waitForResponse(
			(r) =>
				r.url().includes("/api/segment-translations") &&
				r.request().method() === "POST",
		);
		await page.getByRole("button", { name: "Submit", exact: true }).click();
		assert.equal((await translated).status(), 200);
		const voted = page.waitForResponse(
			(r) =>
				r.url().includes("/api/segment-translations") &&
				r.request().method() === "PATCH",
		);
		await page.getByTestId("vote-up-button").first().click();
		assert.equal((await voted).status(), 200);
		console.log(
			"返信・コメント削除・表示モード変更・翻訳の追加と投票を操作できる",
		);

		await page.goto(`${baseUrl}/ja/${handle}`);
		await expect(
			page.getByRole("link", { name: "プロフィールを編集" }),
		).toBeVisible({ timeout: 15000 });
		const read = page.waitForResponse(
			(r) =>
				r.url().includes("/api/notifications") &&
				r.request().method() === "POST",
		);
		await page.getByTestId("bell-icon").click();
		assert.equal((await read).status(), 200);
		await expect(page.getByTestId("notifications-menu-content")).toBeVisible();
		await page.keyboard.press("Escape");
		await page
			.locator("header")
			.getByRole("button", { name: "W", exact: true })
			.click();
		await page.getByTestId("locale-selector-button").click();
		const localeSearch = page.getByPlaceholder("search...");
		await localeSearch.fill("fr");
		await localeSearch.press("ArrowDown");
		await localeSearch.press("Enter");
		await expect(page).toHaveURL(`${baseUrl}/fr/${handle}`);
		console.log(
			"言語選択をキーボードで確定すると、現在のページの選択言語へ移動する",
		);

		const markdown = await page.request.get(
			`${baseUrl}/api/page-markdown?locale=ja&handle=${handle}&slug=${pageSlug}`,
		);
		assert.equal(markdown.status(), 200);
		assert.ok((await markdown.text()).includes("Cloudflareで更新保存"));
		await page.screenshot({
			path: "/tmp/evame-reader-profile.png",
			fullPage: true,
		});
		assert.deepEqual(errors, [], "ブラウザーに未処理エラーがない");
		console.log(
			"本人プロフィール・Markdownダウンロードを維持し、ブラウザーの未処理エラーがない",
		);
		await context.close();
	} finally {
		await browser.close();
	}
}
