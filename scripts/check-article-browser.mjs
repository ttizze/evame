import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function checkArticleBrowser(
	browser,
	baseUrl,
	cookie,
	handle,
	pageSlug,
) {
	for (const width of [1280, 390]) {
		const context = await browser.newContext({
			viewport: { width, height: 900 },
		});
		try {
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
			page.on("pageerror", (error) =>
				errors.push(error.stack ?? error.message),
			);
			const articleUrl = `${baseUrl}/ja/${handle}/${pageSlug}-child?view=both`;
			await page.goto(articleUrl);
			const controls = page.locator(
				'astro-island[component-export="ControlsIsland"]',
			);
			const like = controls.getByRole("button", { name: "Like", exact: true });
			await expect(like).toBeEnabled();
			await expect(controls).toHaveAttribute("ssr", "");
			for (let toggle = 0; toggle < 2; toggle++) {
				const saved = page.waitForResponse(
					(response) =>
						response.url().includes("reader-actions?action=like") &&
						response.request().method() === "POST",
				);
				await like.click();
				const result = await (await saved).json();
				assert.equal(result.success, true);
				await expect(page.locator("[data-like-count]")).toHaveText(
					String(result.data.likeCount),
				);
				for (const button of await page.locator("[data-like-page]").all())
					await expect(button).toHaveAttribute(
						"aria-pressed",
						String(result.data.liked),
					);
			}
			await expect(controls).toHaveAttribute("ssr", "");
			const share = controls.getByRole("button", { name: "共有", exact: true });
			await share.focus();
			await page.keyboard.press("Enter");
			await expect(
				page.getByRole("dialog", { name: "Share", exact: true }),
			).toBeVisible();
			await page.keyboard.press("Escape");
			await expect(like).toBeEnabled();
			await expect(share).toBeFocused();

			const markdown = page.getByRole("link", {
				name: "Markdownをダウンロード",
				exact: true,
			});
			await markdown.hover();
			await expect(page.getByRole("tooltip")).toContainText(
				"Markdownをダウンロード",
			);
			await page.mouse.move(0, 0);
			await page.goto(articleUrl);
			await page
				.getByRole("button", { name: "page tree", exact: true })
				.click();
			await expect(
				page.getByRole("navigation", { name: "Page tree", exact: true }),
			).toBeVisible();
			await page.keyboard.press("Escape");
			await expect(
				page.getByRole("navigation", { name: "Page tree", exact: true }),
			).toBeHidden();
			await expect(
				page.getByRole("button", { name: "page tree", exact: true }),
			).toBeFocused();
			const toc = page.getByRole("button", {
				name: "Table of Contents",
				exact: true,
			});
			const articleActions = page.locator(
				'astro-island[component-export="ArticleActionsIsland"]',
			);
			await expect(articleActions).toHaveAttribute("ssr", "");
			const tocRequests = [];
			const recordTocRequest = (request) => tocRequests.push(request.url());
			page.on("request", recordTocRequest);
			await page
				.getByRole("button", { name: "Table of Contents", exact: true })
				.click();
			await expect(
				page.getByRole("link", { name: "Workersの目次見出し", exact: true }),
			).toBeVisible();
			const panel = page.getByRole("dialog");
			const summary = panel.locator("summary");
			await expect(summary).toBeFocused();
			await expect(
				panel.getByRole("link", { name: "子の目次見出し", exact: true }),
			).toBeHidden();
			await page.keyboard.press("Enter");
			const childHeading = panel.getByRole("link", {
				name: "子の目次見出し",
				exact: true,
			});
			await expect(childHeading).toBeVisible();
			await childHeading.focus();
			await page.keyboard.press("Tab");
			await expect(panel.getByRole("link").first()).toBeFocused();
			await page.keyboard.press("Shift+Tab");
			await expect(childHeading).toBeFocused();
			await expect(articleActions).toHaveAttribute("ssr", "");
			page.off("request", recordTocRequest);
			assert.deepEqual(
				tocRequests.filter((url) => /\.js(?:\?|$)/.test(url)),
				[],
				"目次の初回操作で追加JavaScriptを取得しない",
			);
			await panel.evaluate(async (element) => {
				await Promise.allSettled(
					element.getAnimations().map((animation) => animation.finished),
				);
			});
			await page.screenshot({
				path: `/tmp/evame-toc-${browser.browserType().name()}-${width}.png`,
			});
			await page.keyboard.press("Escape");
			await expect(panel).toBeHidden();
			await expect(toc).toBeFocused();
			await toc.click();
			await expect(page.getByRole("dialog")).toBeVisible();
			await page.locator("[data-article-header] time").click();
			await expect(page.getByRole("dialog")).toBeHidden();
			await page.evaluate(() => {
				const gap = document.createElement("div");
				gap.style.height = "1200px";
				document.querySelector("[data-article-header]").before(gap);
				const tail = document.createElement("div");
				tail.style.height = "4000px";
				document.body.append(tail);
				window.scrollTo(0, 900);
			});
			await page.evaluate(() => window.scrollTo(0, 800));
			const header = page.locator("[data-article-header] [data-scroll-header]");
			await expect(header).not.toHaveCSS("position", "fixed");
			await page.evaluate(() => window.scrollTo(0, 2000));
			await expect(header).toHaveClass(/-translate-y-full/);
			await page.evaluate(() => window.scrollTo(0, 1800));
			await expect(header).toHaveCSS("position", "fixed");
			await expect(header.locator("time")).toBeVisible();
			await page.evaluate(() => window.scrollTo(0, 0));
			await expect(header).not.toHaveCSS("position", "fixed");

			await page.goto(`${articleUrl}#comments`);
			const comments = page.locator("#comments");
			const text = `${browser.browserType().name()} ${width} 共通化したコメント入力`;
			await comments
				.locator('[data-testid="lexical-editor"][contenteditable=true]')
				.first()
				.fill(text);
			const posted = page.waitForResponse(
				(response) =>
					response.url().includes("reader-actions?action=comment") &&
					response.request().method() === "POST",
			);
			await comments
				.getByRole("button", { name: "投稿", exact: true })
				.first()
				.click();
			assert.equal((await (await posted).json()).success, true);
			await expect(comments.getByText(text, { exact: true })).toBeVisible();
			await page.reload();
			await expect(comments.getByText(text, { exact: true })).toBeVisible();
			await comments
				.getByRole("button", { name: "More options", exact: true })
				.last()
				.click();
			const deleted = page.waitForResponse(
				(response) =>
					response.url().includes("reader-actions?action=deleteComment") &&
					response.request().method() === "POST",
			);
			await page.getByText("Delete", { exact: true }).click();
			assert.equal((await (await deleted).json()).success, true);
			await expect(comments.getByText(text, { exact: true })).toHaveCount(0);

			await page.goto(`${baseUrl}/en/${handle}/${pageSlug}?view=both`);
			const segment = page
				.locator("article .js-content .seg-tr")
				.filter({ hasText: "Existing English translation" })
				.first();
			await segment.click();
			await expect(
				page.getByPlaceholder("Or enter your translation..."),
			).toBeVisible();
			await segment.click();
			await expect(
				page.getByPlaceholder("Or enter your translation..."),
			).toHaveCount(0);
			await segment.evaluate((element) =>
				window.getSelection().selectAllChildren(element),
			);
			await segment.click();
			await expect(
				page.getByPlaceholder("Or enter your translation..."),
			).toHaveCount(0);
			await page.screenshot({
				path: `/tmp/evame-article-${browser.browserType().name()}-${width}.png`,
			});
			assert.deepEqual(errors, []);
			console.log(
				`${browser.browserType().name()} ${width}: 初回のいいね・共有・目次・階層・ツールチップ、移動後の固定、コメント保存・再読み込み、翻訳と文字選択を確認`,
			);
		} finally {
			await context.close();
		}
	}
}
