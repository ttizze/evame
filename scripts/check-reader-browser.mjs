import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { TextWriter, Uint8ArrayReader, ZipReader } from "@zip.js/zip.js";
import { fromJSON } from "seroval";
import { checkHeaderBrowser } from "./check-header-browser.mjs";

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
		await expect(
			staticPage
				.locator("header")
				.getByRole("link", { name: "Worker Test", exact: true }),
		).toHaveAttribute("href", `/ja/${handle}`);
		await staticPage
			.locator("header")
			.getByRole("link", { name: "Worker Test", exact: true })
			.click();
		await expect(staticPage).toHaveURL(`${baseUrl}/ja/${handle}`);
		await expect(
			staticPage.getByRole("heading", { name: "Worker Test", exact: true }),
		).toHaveCount(0);
		await expect(
			staticPage.getByText(`@${handle}`, { exact: true }),
		).toHaveCount(0);
		await expect(
			staticPage
				.locator("main > div > section")
				.first()
				.locator('astro-island[component-export="UserAvatar"]'),
		).toHaveCount(0);
		await expect(
			staticPage.getByRole("button", { name: "0 following", exact: true }),
		).toBeVisible();
		await expect(
			staticPage.getByRole("button", { name: "0 followers", exact: true }),
		).toBeVisible();
		await staticPage
			.getByRole("link", { name: "Workers保存テスト", exact: true })
			.first()
			.click();
		await expect(staticPage).toHaveURL(`${baseUrl}/ja/${handle}/${pageSlug}`);
		await expect(staticPage.locator("header")).toBeVisible();
		await staticPage.goto(`${baseUrl}/ja/${handle}/${pageSlug}?view=both`);
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
		for (const pageNumber of ["0", "-1", "1.5", "2junk", "9007199254740992"]) {
			await staticPage.goto(
				`${baseUrl}/ja/search?query=Workers&category=title&page=${pageNumber}`,
			);
			await expect(
				staticPage
					.locator("main")
					.getByRole("link", { name: "Workers保存テスト", exact: true })
					.first(),
			).toBeVisible();
		}
		await staticPage.getByRole("tab", { name: "本文", exact: true }).click();
		await expect(staticPage).toHaveURL(/category=content/);
		await expect(
			staticPage
				.locator("main")
				.getByRole("link", { name: "Workers保存テスト", exact: true })
				.first(),
		).toBeVisible();
		await noScript.close();
		console.log("JavaScript無効でも記事一覧・本文・表示モードを読める");
		await checkHeaderBrowser(browser, baseUrl, cookie, handle, pageSlug);
		const context = await browser.newContext({
			viewport: { width: 1280, height: 900 },
		});
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
		let homeRefreshes = 0;
		let notificationReads = 0;
		page.on("response", async (response) => {
			const url = new URL(response.url());
			if (
				url.pathname === "/api/notifications" &&
				response.request().method() === "POST"
			)
				notificationReads++;
			if (url.origin === baseUrl && response.status() >= 500)
				console.error({
					path: url.pathname + url.search,
					status: response.status(),
					body: await response.text().catch(() => "Response disposed"),
				});
			if (
				url.pathname === "/api/reader-data" &&
				url.searchParams.get("path") === "/ja"
			)
				homeRefreshes++;
		});
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
		).toBeVisible({ timeout: 15000 });
		await expect(page.locator("header").getByTestId("unread-count")).toHaveText(
			"1",
		);
		await expect(
			page
				.locator("header")
				.getByRole("button", { name: "使い方", exact: true }),
		).toHaveCount(0);
		await expect(page.locator("header svg.lucide-bell")).toHaveCount(0);
		const commonHeaderBounds = await page.locator("header").boundingBox();
		const consent = page.getByRole("region", {
			name: "Cookieを許可しますか？",
		});
		await expect(consent).toBeVisible();
		assert.equal(
			await consent.evaluate(
				(node) => getComputedStyle(node.parentElement).position,
			),
			"fixed",
			"Cookieバーは画面右下に固定される",
		);
		await expect(consent).toContainText(
			"Evameではサービス提供と改善のためにCookieを使用します。",
		);
		const consentBounds = await consent.boundingBox();
		assert.equal(consentBounds.width, 420);
		assert.equal(1280 - consentBounds.x - consentBounds.width, 20);
		assert.equal(900 - consentBounds.y - consentBounds.height, 20);
		const floating = page.locator(
			'astro-island[component-export="ControlsIsland"] > div',
		);
		await expect(floating).toHaveCSS("position", "fixed");
		await expect(floating).toHaveCSS("bottom", "16px");
		await expect(page.locator("h1 svg.lucide-sparkles")).toBeVisible();
		await expect(
			page.locator("main article").first().locator("svg.lucide-eye"),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "もっと見る" })).toHaveCSS(
			"height",
			"40px",
		);
		await expect(page.getByRole("link", { name: "もっと見る" })).not.toHaveCSS(
			"background-color",
			"rgba(0, 0, 0, 0)",
		);
		await page.screenshot({ path: "/tmp/evame-ui-restored-home-desktop.png" });
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(page.locator("header")).toHaveCSS("padding-top", "8px");
		const commonMobileHeaderBounds = await page.locator("header").boundingBox();
		await expect(consent).toBeVisible();
		const mobileConsent = await consent.boundingBox();
		assert.equal(mobileConsent.x, 12);
		assert.equal(mobileConsent.width, 366);
		assert.equal(844 - mobileConsent.y - mobileConsent.height, 12);
		await page.screenshot({ path: "/tmp/evame-ui-restored-home-mobile.png" });
		await page.setViewportSize({ width: 1280, height: 900 });
		await expect(
			page
				.locator("footer")
				.getByRole("link", { name: "GitHub" })
				.locator("svg"),
		).toBeVisible();
		await consent
			.getByRole("button", { name: "許可しない", exact: true })
			.click();
		await expect
			.poll(() => homeRefreshes, { timeout: 35000 })
			.toBeGreaterThan(1);
		console.log(
			"本文HTMLを最初から配信しながら、トップの記事一覧の自動更新も維持する",
		);
		await expect(page.locator("#about-section")).toHaveCount(0);
		await page.getByRole("button", { name: "Create a new page" }).click();
		await page.waitForURL(/\/edit$/);
		await page.goBack();
		await expect(
			page.getByRole("button", { name: "Create a new page" }),
		).toBeEnabled({ timeout: 15000 });
		await page.getByRole("button", { name: "Create a new page" }).click();
		await page.waitForURL(/\/edit$/);
		const newPageUrl = page.url().replace(/\/edit$/, "");
		await page
			.getByTestId("lexical-editor")
			.locator(":scope > h1:first-child")
			.fill("ブラウザー新規保存");
		const editor = page.locator(
			'[data-testid="lexical-editor"][contenteditable=true]',
		);
		const firstBody = editor.locator(":scope > p").first();
		const bodyBlocks = editor.locator(":scope > :not(:first-child)");
		await firstBody.click();
		const insertBlock = page
			.getByTestId("editor-floating-menu")
			.getByRole("button", { name: "ブロックを追加" });
		await expect(insertBlock).toBeVisible();
		const emptyLine = await editor.locator("p").first().boundingBox();
		const insertBox = await insertBlock.boundingBox();
		const placeholder = await firstBody.evaluate((element) => {
			const style = getComputedStyle(element, "::before");
			const parent = element.offsetParent;
			return {
				content: style.content,
				x:
					parent.getBoundingClientRect().x +
					parent.clientLeft +
					Number.parseFloat(style.left),
			};
		});
		assert.ok(emptyLine && insertBox);
		assert.equal(placeholder.content, '"本文を書く…"');
		assert.ok(
			Math.abs(placeholder.x - emptyLine.x) <= 1,
			"プレースホルダーとカーソルの左端を揃える",
		);
		assert.ok(
			Math.abs(
				insertBox.y + insertBox.height / 2 - emptyLine.y - emptyLine.height / 2,
			) <= 1,
			"空行と＋ボタンの中央を揃える",
		);
		await insertBlock.click();
		await expect(
			page.getByRole("menuitem", { name: "見出し2", exact: true }),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await firstBody.fill("Lexicalのブラウザー入力を保存する");
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
			.toContain("Lexicalのブラウザー入力を保存する");
		console.log(
			"ログイン済みトップから新規ページを開き、Lexicalで入力した本文を保存できる",
		);
		await firstBody.evaluate((element) => {
			const range = document.createRange();
			range.selectNodeContents(element);
			const selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(range);
		});
		await page
			.getByTestId("editor-bubble-menu")
			.getByRole("button", { name: "太字", exact: true })
			.click();
		await expect(editor.locator("strong")).toContainText(
			"Lexicalのブラウザー入力を保存する",
		);
		await expect
			.poll(
				async () => {
					const response = await page.request.get(newPageUrl);
					return response.text();
				},
				{ timeout: 20000 },
			)
			.toContain("<strong>Lexicalのブラウザー入力を保存する</strong>");
		await page.reload();
		await expect(editor.locator("strong")).toContainText(
			"Lexicalのブラウザー入力を保存する",
		);
		await firstBody.fill("");
		await editor.evaluate((element) => {
			const data = new DataTransfer();
			data.setData(
				"text/plain",
				"## GFMの見出し\n\n~~取り消し~~\n\n- [x] 完了\n\n| 名前 | 値 |\n| --- | --- |\n| 本文 | 内容 |",
			);
			element.dispatchEvent(
				new ClipboardEvent("paste", {
					clipboardData: data,
					bubbles: true,
					cancelable: true,
				}),
			);
		});
		await expect(editor.locator("h2")).toHaveText("GFMの見出し");
		await expect(editor.locator("table")).toContainText("本文");
		await editor.locator("h2").hover();
		const dragHandle = page.getByTestId("editor-drag-handle");
		await expect(dragHandle).toBeVisible();
		const handleBox = await dragHandle.boundingBox();
		const destination = await editor
			.locator("p")
			.filter({ hasText: "取り消し" })
			.boundingBox();
		assert.ok(handleBox && destination);
		await page.mouse.move(
			handleBox.x + handleBox.width / 2,
			handleBox.y + handleBox.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(
			destination.x + 10,
			destination.y + destination.height - 2,
			{ steps: 12 },
		);
		await expect(page.getByTestId("editor-drop-line")).toHaveCSS(
			"opacity",
			"0.4",
		);
		await page.mouse.move(
			destination.x + 10,
			destination.y + destination.height - 2,
		);
		await page.mouse.up();
		await expect(bodyBlocks.first()).toHaveText("取り消し");
		await editor.press("ControlOrMeta+z");
		await expect(bodyBlocks.first()).toHaveText("GFMの見出し");
		await editor.press("ControlOrMeta+Shift+z");
		await expect(bodyBlocks.first()).toHaveText("取り消し");
		const markdownUrl = new URL("/api/page-markdown", baseUrl);
		markdownUrl.search = new URLSearchParams({
			locale: "ja",
			handle,
			slug: new URL(newPageUrl).pathname.split("/").at(-1),
		}).toString();
		await expect
			.poll(
				async () => {
					const response = await page.request.get(markdownUrl.href);
					return response.text();
				},
				{ timeout: 20000 },
			)
			.toMatch(/^~~取り消し~~\n\n## GFMの見出し/);
		await expect
			.poll(
				async () => {
					const response = await page.request.get(newPageUrl);
					return response.text();
				},
				{ timeout: 20000 },
			)
			.toContain("<table>");
		await page.reload();
		await expect(editor.locator("table")).toContainText("本文");
		await expect(bodyBlocks.first()).toHaveText("取り消し");
		console.log(
			"マウスで見出しを並べ替え、Undo・Redo・保存・再読み込みでも順序と装飾を保つ",
		);
		await page.screenshot({
			path: "/tmp/evame-lexical-editor-desktop.png",
			fullPage: true,
		});
		await page.setViewportSize({ width: 390, height: 844 });
		await editor.locator("h2").hover();
		await expect(dragHandle).not.toBeVisible();
		await page.screenshot({
			path: "/tmp/evame-lexical-editor-mobile.png",
			fullPage: true,
		});
		await page.setViewportSize({ width: 1280, height: 900 });
		console.log(
			"Lexicalの装飾操作とGFMの貼り付けを保存し、再読み込みしても維持できる",
		);
		await page.goto(
			`${baseUrl}/ja/${handle}/${pageSlug}?page=2&view=both#comments`,
		);
		const commentPages = page.locator("#comments");
		await expect(
			commentPages.getByText("comment-marker-21", { exact: true }),
		).toBeVisible();
		await expect(
			commentPages
				.locator('[data-testid="lexical-editor"][contenteditable=true]')
				.first(),
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
		await expect(
			page.locator('astro-island[component-export="PageNavigationIsland"]'),
		).not.toHaveAttribute("ssr", "");
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
			page.locator('astro-island[component-export="ArticleToolsIsland"]'),
		).not.toHaveAttribute("ssr", "");
		await page.locator("#comments").scrollIntoViewIfNeeded();
		await expect(
			page
				.locator(
					'#comments [data-testid="lexical-editor"][contenteditable=true]',
				)
				.first(),
		).toBeVisible();
		await expect(
			page.locator('[data-tweet-id="123456789"]').getByText("Tweet not found"),
		).toBeVisible({ timeout: 15000 });
		await page.evaluate(() => window.scrollTo(0, 0));
		await expect(
			page.locator("[data-article-header] > div").first(),
		).not.toHaveCSS("position", "fixed");
		await expect(
			page
				.locator('astro-island[component-export="PageLikeButtonClient"]')
				.first()
				.getByText("0", { exact: true }),
		).toBeVisible();
		await expect(
			page
				.getByRole("link", { name: "Markdownをダウンロード" })
				.locator("svg.lucide-download"),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Edit page", exact: true }),
		).toHaveCount(0);
		await expect(page.locator("header")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Create a new page" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "アカウントメニュー" }),
		).toBeVisible();
		await expect(
			page.locator("header").getByRole("link", { name: "記事", exact: true }),
		).toHaveCount(0);
		await expect(
			page
				.locator("header")
				.getByRole("link", { name: "Worker Test", exact: true }),
		).toHaveAttribute("href", `/ja/${handle}`);
		await expect(
			page
				.locator("header")
				.getByRole("link", { name: "Search for pages", exact: true }),
		).toBeVisible();
		await expect
			.poll(() => page.locator("header").boundingBox(), {
				message: "ブログでも元のヘッダーの位置・幅・高さを保つ",
			})
			.toEqual(commonHeaderBounds);
		const titleBounds = await page
			.getByRole("heading", { name: "Workers保存テスト", exact: true })
			.boundingBox();
		const headerBounds = await page
			.locator("[data-article-header]")
			.boundingBox();
		assert.ok(
			titleBounds.y < headerBounds.y,
			"タイトルの下に著者・目次を表示する",
		);
		for (const viewport of [
			{ width: 1280, height: 900 },
			{ width: 390, height: 844 },
		]) {
			await page.setViewportSize(viewport);
			await expect(floating).toHaveCSS("opacity", "1");
			for (const label of ["View", "Like", "Share"]) {
				await expect(floating.getByText(label, { exact: true })).toHaveCount(0);
			}
			await expect(floating.getByRole("button")).toHaveCount(3);
			await expect(floating.locator("svg.lucide-heart")).toBeVisible();
			await expect(floating.locator("svg.lucide-share")).toBeVisible();
			await expect(
				floating.getByRole("button", { name: /^Currently:/ }),
			).toContainText("JA");
			const share = floating.getByRole("button", { name: "共有", exact: true });
			await expect(share).toHaveCSS("width", "40px");
			await expect(share).toHaveCSS("height", "40px");
			await share.focus();
			await page.keyboard.press("Enter");
			await expect(
				page.getByRole("dialog", { name: "Share", exact: true }),
			).toBeVisible();
			await expect(
				page.getByRole("dialog").getByRole("img", { name: "X", exact: true }),
			).toBeVisible();
			await page.keyboard.press("Escape");
			await expect(page.getByRole("dialog")).toHaveCount(0);
			await expect(share).toBeFocused();
			await page.screenshot({
				path: `/tmp/evame-floating-labels-${viewport.width}.png`,
			});
		}
		await page.setViewportSize({ width: 1280, height: 900 });
		console.log(
			"PC・スマホのバーでView・Like・Shareの文字を表示せず、アイコン・言語表示・共有のキーボード操作を維持する",
		);
		await page.screenshot({
			path: "/tmp/evame-ui-restored-article-desktop.png",
		});
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(page.locator("header")).toHaveCSS("padding-top", "8px");
		await expect
			.poll(() => page.locator("header").boundingBox(), {
				message: "モバイルでも元のヘッダーの位置・幅・高さを保つ",
			})
			.toEqual(commonMobileHeaderBounds);
		assert.ok(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
			"記事ページもモバイルで横にはみ出さない",
		);
		await page.screenshot({ path: "/tmp/evame-blog-article-mobile.png" });
		await page.setViewportSize({ width: 1280, height: 900 });
		await page
			.getByRole("button", { name: "Table of Contents", exact: true })
			.click();
		await expect(
			page.getByRole("link", { name: "Workersの目次見出し", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: "Table of contents" }).locator(".."),
		).toHaveCSS("width", "320px");
		await expect(
			page.getByRole("navigation", { name: "Table of contents" }).locator(".."),
		).toHaveCSS("opacity", "1");
		await page.screenshot({ path: "/tmp/evame-ui-restored-toc-desktop.png" });
		await page.keyboard.press("Escape");
		await page.setViewportSize({ width: 390, height: 844 });
		await page
			.getByRole("button", { name: "Table of Contents", exact: true })
			.click();
		await expect(
			page.getByRole("link", { name: "Workersの目次見出し", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: "Table of contents" }).locator(".."),
		).toHaveCSS("opacity", "1");
		assert.ok(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
			"モバイルの目次は横にはみ出さない",
		);
		await page.screenshot({ path: "/tmp/evame-ui-restored-toc-mobile.png" });
		await page
			.getByRole("link", { name: "Workersの目次見出し", exact: true })
			.click();
		await expect(page).toHaveURL(/#workersの目次見出し|#workers%E3%81%AE/);
		await page.keyboard.press("Escape");
		await expect(
			page.getByRole("navigation", { name: "Table of contents" }),
		).toHaveCount(0);
		// 見出しリンクのフォーカス移動・hashスクロールから独立して上下スクロールを検証する。
		await page.goto(`${baseUrl}/ja/${handle}/${pageSlug}`);
		await expect(
			page.locator('astro-island[component-export="ArticleToolsIsland"]'),
		).not.toHaveAttribute("ssr", "");
		await page.locator("#comments").scrollIntoViewIfNeeded();
		await expect(
			page
				.locator(
					'#comments [data-testid="lexical-editor"][contenteditable=true]',
				)
				.first(),
		).toBeVisible();
		await expect(
			page.locator('[data-tweet-id="123456789"]').getByText("Tweet not found"),
		).toBeVisible({ timeout: 15000 });
		await page.evaluate(async () => {
			await document.fonts.ready;
			window.scrollTo(0, 0);
		});
		await expect(floating).toHaveCSS("opacity", "1");
		await page.evaluate(() => window.scrollTo(0, 1000));
		await expect(
			page.locator("[data-article-header] > div").first(),
		).toHaveClass(/-translate-y-full/);
		await expect(floating).toHaveCSS("opacity", "0");
		await page.evaluate(() => window.scrollTo(0, 700));
		await expect(page.locator("[data-article-header] > div").first()).toHaveCSS(
			"position",
			"fixed",
		);
		await expect(floating).toHaveCSS("opacity", "1");
		await page
			.getByRole("button", { name: "Table of Contents", exact: true })
			.click();
		await expect(
			page.getByRole("link", { name: "Workersの目次見出し", exact: true }),
		).toBeVisible();
		await page.screenshot({ path: "/tmp/evame-ui-restored-pinned-mobile.png" });
		await page.keyboard.press("Escape");
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.setViewportSize({ width: 1280, height: 900 });
		console.log(
			"アイコン・Cookieの位置・目次の幅とジャンプ・ヘッダーとフローティングバーのスクロール動作を維持する",
		);
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
			.locator('[data-testid="lexical-editor"][contenteditable=true]')
			.first();
		await commentEditor.fill("ブラウザーからコメントを投稿");
		const posted = page.waitForResponse(
			(r) =>
				r.url().includes("reader-actions?action=comment") &&
				r.request().method() === "POST",
		);
		await comments
			.getByRole("button", { name: "投稿", exact: true })
			.first()
			.click();
		const postedResponse = await posted;
		assert.equal(
			postedResponse.status(),
			200,
			postedResponse.status() === 200 ? "" : await postedResponse.text(),
		);
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
			.locator('[data-testid="lexical-editor"][contenteditable=true]')
			.nth(1)
			.fill("ブラウザーから返信する");
		const replied = page.waitForResponse(
			(r) =>
				r.url().includes("reader-actions?action=comment") &&
				r.request().method() === "POST",
		);
		await comments
			.getByRole("button", { name: "投稿", exact: true })
			.nth(1)
			.click();
		assert.equal((await replied).status(), 200);
		await expect(
			comments.locator('[data-testid="lexical-editor"][contenteditable=true]'),
		).toHaveCount(1, { timeout: 15000 });
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
		const votedResponse = await voted;
		assert.equal(votedResponse.status(), 200, await votedResponse.text());
		console.log(
			"返信・コメント削除・表示モード変更・翻訳の追加と投票を操作できる",
		);

		await page.goto(`${baseUrl}/ja/${handle}`);
		await expect(
			page.getByRole("link", { name: "プロフィールを編集" }),
		).toHaveCount(0);
		for (const width of [1280, 390]) {
			await page.setViewportSize({ width, height: 900 });
			await expect(
				page
					.locator("header")
					.getByRole("link", { name: "Worker Test", exact: true }),
			).toHaveAttribute("href", `/ja/${handle}`);
			await expect(
				page.getByRole("heading", { name: "Worker Test", exact: true }),
			).toHaveCount(0);
			await expect(page.getByText(`@${handle}`, { exact: true })).toHaveCount(
				0,
			);
			await expect(
				page
					.locator("main > div > section")
					.first()
					.locator('astro-island[component-export="UserAvatar"]'),
			).toHaveCount(0);
			await expect(
				page.getByRole("button", { name: "0 following", exact: true }),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "0 followers", exact: true }),
			).toBeVisible();
			await expect(
				page
					.getByRole("link", { name: "Workers保存テスト", exact: true })
					.first(),
			).toBeVisible();
		}
		await page.setViewportSize({ width: 1280, height: 900 });
		await expect(
			page.locator('astro-island[component-export="FollowStats"]'),
		).not.toHaveAttribute("ssr", "");
		await page
			.getByRole("button", { name: "0 followers", exact: true })
			.click();
		await expect(
			page.getByRole("dialog", { name: "Followers", exact: true }),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator("header")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "More options", exact: true }),
		).toHaveCount(0);
		await page
			.locator("[data-blog-footer]")
			.getByRole("link", { name: "Evame", exact: true })
			.click();
		await expect(page).toHaveURL(`${baseUrl}/ja`);
		await page
			.getByRole("button", { name: "アカウントメニュー", exact: true })
			.click();
		await expect(
			page.getByRole("menuitem", { name: "通知", exact: true }),
		).toBeVisible();
		await page.getByRole("menuitem", { name: "使い方", exact: true }).focus();
		await page.keyboard.press("Enter");
		await expect(
			page.getByRole("dialog", { name: "使い方", exact: true }),
		).toBeVisible();
		assert.equal(
			notificationReads,
			0,
			"アカウントと使い方を開くだけでは通知を既読にしない",
		);
		await page.keyboard.press("Escape");
		const read = page.waitForResponse(
			(r) =>
				r.url().includes("/api/notifications") &&
				r.request().method() === "POST",
		);
		await page.getByRole("menuitem", { name: "通知", exact: true }).click();
		assert.equal((await read).status(), 200);
		await expect(page.getByTestId("notifications-menu-content")).toBeVisible();
		await expect(page.getByTestId("notifications-menu-content")).toContainText(
			"通知確認ユーザー",
		);
		await expect(
			page.locator("header").getByTestId("unread-count"),
		).toHaveCount(0);
		const followNotification = page
			.getByTestId("notifications-menu-content")
			.getByRole("menuitem")
			.filter({ hasText: "通知確認ユーザー" });
		const actorProfile = await followNotification
			.getByRole("link", { name: "通知確認ユーザー", exact: true })
			.last()
			.getAttribute("href");
		await page.mouse.move(0, 0);
		await followNotification.focus();
		await expect(followNotification).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(`${baseUrl}${actorProfile}`);
		await page.goto(`${baseUrl}/ja`);
		await page
			.getByRole("button", { name: "アカウントメニュー", exact: true })
			.click();
		await page.getByRole("menuitem", { name: "通知", exact: true }).click();
		const articleNotification = page
			.getByTestId("notifications-menu-content")
			.getByRole("menuitem")
			.filter({ hasText: "Workers保存テスト" })
			.first();
		await articleNotification
			.getByRole("link", { name: "Worker Test", exact: true })
			.last()
			.click();
		await expect(page).toHaveURL(`${baseUrl}/ja/${handle}`);
		await page
			.getByRole("button", { name: "アカウントメニュー", exact: true })
			.click();
		await page.getByRole("menuitem", { name: "通知", exact: true }).click();
		await page.mouse.move(0, 0);
		await articleNotification.focus();
		await expect(articleNotification).toBeFocused();
		await page.keyboard.press("Space");
		await expect(page).toHaveURL(`${baseUrl}/ja/${handle}/${pageSlug}`);
		await page.goto(`${baseUrl}/ja`);
		await page
			.locator("header")
			.getByRole("button", { name: "アカウントメニュー", exact: true })
			.click();
		await expect(
			page.getByRole("menuitem", { name: "プロフィール・設定", exact: true }),
		).toHaveAttribute("href", `/ja/${handle}/edit`);
		await page.keyboard.press("Escape");
		await page.goto(`${baseUrl}/ja/${handle}`);
		await expect(
			page.locator('astro-island[component-export="HeaderIsland"]'),
		).not.toHaveAttribute("ssr", "");
		await page
			.getByRole("button", { name: "アカウントメニュー", exact: true })
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
		await page.goto(`${baseUrl}/ja/search?query=Workers&category=title`);
		await expect(
			page.locator('astro-island[component-export="SearchIsland"]'),
		).not.toHaveAttribute("ssr", "");
		await expect(
			page.getByRole("tab", { name: "タイトル", exact: true }),
		).toHaveAttribute("aria-selected", "true");
		await page.getByRole("tab", { name: "本文", exact: true }).click();
		await page
			.getByRole("searchbox", { name: "検索", exact: true })
			.fill("Cloudflare");
		await expect(
			page
				.locator("main")
				.getByRole("link", { name: "Workers保存テスト" })
				.first(),
		).toBeVisible();
		await expect(page).toHaveURL(/category=content/);
		await page.getByRole("tab", { name: "ユーザー", exact: true }).click();
		await expect(page).toHaveURL(/category=user/);
		const userSearch = page.waitForResponse((response) => {
			const url = new URL(response.url());
			const search = new URLSearchParams(url.searchParams.get("search") ?? "");
			return (
				url.pathname === "/api/reader-data" &&
				search.get("category") === "user" &&
				search.get("query") === "Worker Test"
			);
		});
		await page
			.getByRole("searchbox", { name: "検索", exact: true })
			.fill("Worker Test");
		const userSearchResponse = await userSearch;
		assert.equal(userSearchResponse.status(), 200);
		assert.ok(
			fromJSON(await userSearchResponse.json()).page.data.users.some(
				(user) => user.handle === handle,
			),
			"対象のユーザー検索応答に所有者を含む",
		);
		await expect(
			page.locator(`main a[href="/ja/${handle}"]`).first(),
		).toBeVisible();
		await page.screenshot({ path: "/tmp/evame-ui-restored-search.png" });
		console.log("検索タブの切り替えと入力による検索結果の更新を維持する");
		const settingsData = await page.request.get(
			`${baseUrl}/api/reader-data?${new URLSearchParams({ path: `/ja/${handle}/${pageSlug}` })}`,
		);
		const settingsPageId = fromJSON(await settingsData.json()).page.data
			.pageDetail.id;
		await page.goto(`${baseUrl}/ja/${handle}/${pageSlug}/edit`);
		await page.getByRole("button", { name: "公開設定: 公開中" }).click();
		await expect(
			page.getByRole("heading", { name: "公開設定", exact: true }),
		).toHaveCount(0);
		await expect(
			page.getByRole("link", { name: "プレビュー", exact: true }),
		).toBeVisible();
		const commentsSwitch = page.getByRole("switch", {
			name: "コメントを受け付ける",
		});
		await expect(commentsSwitch).toBeChecked();
		const stopped = page.waitForResponse(
			(response) =>
				response.url().includes("reader-actions?action=pageComments") &&
				response.request().method() === "POST",
		);
		await commentsSwitch.click();
		assert.equal((await (await stopped).json()).success, true);
		await expect(commentsSwitch).not.toBeChecked();
		await page.screenshot({ path: "/tmp/evame-publication-desktop.png" });
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(commentsSwitch).toBeVisible();
		await page.screenshot({ path: "/tmp/evame-publication-mobile.png" });
		await page.reload();
		await page.getByRole("button", { name: "公開設定: 公開中" }).click();
		await expect(commentsSwitch).not.toBeChecked();
		const closedUrl = `${baseUrl}/ja/${handle}/${pageSlug}#comments`;
		const closedHtml = await page.request.get(closedUrl);
		assert.ok(
			(await closedHtml.text()).includes("コメントの受付を停止しています。"),
			"JavaScript起動前のHTMLにも受付停止を反映する",
		);
		await page.goto(closedUrl);
		const closedComments = page.locator("#comments");
		await expect(closedComments.getByRole("status")).toContainText(
			"コメントの受付を停止しています。",
		);
		await expect(
			closedComments.getByText("comment-marker-01", { exact: true }),
		).toBeVisible();
		await expect(
			closedComments.getByRole("button", { name: /^Reply/ }),
		).toHaveCount(0);
		await expect(
			closedComments.locator('[data-testid="lexical-editor"]'),
		).toHaveCount(0);
		const rejectedComment = await page.request.post(
			`${baseUrl}/api/reader-actions?action=comment`,
			{
				data: {
					pageId: settingsPageId,
					userLocale: "ja",
					content: "<p>受付停止後の投稿</p>",
				},
			},
		);
		assert.deepEqual(await rejectedComment.json(), {
			success: false,
			message: "COMMENTS_CLOSED",
		});
		await page.goto(`${baseUrl}/ja/${handle}/${pageSlug}/edit`);
		await page.getByRole("button", { name: "公開設定: 公開中" }).click();
		await commentsSwitch.click();
		await expect(commentsSwitch).toBeChecked();
		await page.goto(closedUrl);
		await expect(
			page.locator('#comments [data-testid="lexical-editor"]').first(),
		).toBeVisible({ timeout: 15000 });
		await expect(
			page
				.locator("#comments")
				.getByRole("button", { name: /^Reply/ })
				.first(),
		).toBeVisible();
		await page.setViewportSize({ width: 1280, height: 900 });
		console.log(
			"公開設定でコメント受付をOFF・ONにでき、再読み込み・SSR・投稿拒否・既存コメントの閲覧を維持する",
		);
		await page.goto(
			`${baseUrl}/ja/${handle}/page-management?query=${encodeURIComponent("ブラウザー新規保存")}`,
		);
		await expect(
			page.getByRole("button", { name: "アカウントメニュー", exact: true }),
		).toBeVisible();
		await page
			.getByRole("list", { name: "記事管理", exact: true })
			.getByRole("button", { name: "More options", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Make Public", exact: true })
			.click();
		await expect(
			page
				.getByRole("list", { name: "記事管理", exact: true })
				.getByText("Public", { exact: true }),
		).toBeVisible();
		await page.goto(`${baseUrl}/ja/${handle}`);
		const blogCard = page.locator("main article").filter({
			has: page.getByRole("link", {
				name: "ブラウザー新規保存",
				exact: true,
			}),
		});
		await expect(blogCard).toBeVisible();
		await expect(
			blogCard.getByRole("button", { name: "More options", exact: true }),
		).toHaveCount(0);
		await page
			.locator("[data-blog-footer]")
			.getByRole("link", { name: "Evame", exact: true })
			.click();
		await page
			.getByRole("button", { name: "アカウントメニュー", exact: true })
			.click();
		await page.getByRole("menuitem", { name: "記事管理", exact: true }).click();
		await expect(
			page.getByRole("button", { name: "アカウントメニュー", exact: true }),
		).toBeVisible();
		await page
			.getByRole("textbox", { name: "Search pages" })
			.fill("ブラウザー新規保存");
		const managementList = page.getByRole("list", {
			name: "記事管理",
			exact: true,
		});
		await expect(managementList.getByRole("listitem")).toHaveCount(1);
		const ownerCard = managementList.getByRole("listitem").filter({
			has: page.getByRole("link", {
				name: "ブラウザー新規保存",
				exact: true,
			}),
		});
		await ownerCard
			.getByRole("button", { name: "More options", exact: true })
			.click();
		await expect(
			page.getByRole("menuitem", { name: "Edit", exact: true }),
		).toHaveAttribute("href", `${new URL(newPageUrl).pathname}/edit`);
		const hiddenResponse = page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname.startsWith("/_serverFn/") &&
				response.request().method() === "POST",
		);
		await Promise.all([
			page.getByRole("button", { name: "Make Private", exact: true }).click(),
			hiddenResponse.then(async (response) => {
				const status = response.status();
				assert.equal(status, 200, status === 200 ? "" : await response.text());
			}),
		]);
		await expect(ownerCard.getByText("Private", { exact: true })).toBeVisible();
		await expect(page.getByRole("menu")).toHaveCount(0);
		const hiddenBlog = await page.request.get(`${baseUrl}/ja/${handle}`);
		assert.ok(
			!(await hiddenBlog.text()).includes("ブラウザー新規保存"),
			"管理で非公開にするとブログ一覧から消える",
		);
		await ownerCard
			.getByRole("button", { name: "More options", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Make Public", exact: true })
			.click();
		await expect(ownerCard.getByText("Public", { exact: true })).toBeVisible();
		await expect(page.getByRole("menu")).toHaveCount(0);
		await ownerCard
			.getByRole("button", { name: "More options", exact: true })
			.click();
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		const deletedResponse = page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname.startsWith("/_serverFn/") &&
				response.request().method() === "POST",
		);
		await Promise.all([
			page
				.getByRole("dialog", { name: "Delete Page" })
				.getByRole("button", { name: "Delete", exact: true })
				.click(),
			deletedResponse.then(async (response) => {
				const status = response.status();
				assert.equal(status, 200, status === 200 ? "" : await response.text());
			}),
		]);
		await expect(ownerCard).toHaveCount(0);
		await page.goto(`${baseUrl}/ja/${handle}`);
		await expect(blogCard).toHaveCount(0);
		await expect(page.locator("header")).toBeVisible();
		console.log(
			"ブログのカードに管理操作を出さず、従来のアカウントメニューから記事管理を操作できる",
		);
		await page.screenshot({
			path: "/tmp/evame-reader-profile.png",
			fullPage: true,
		});
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(
			page.locator('astro-island[component-export="HeaderIsland"]'),
		).not.toHaveAttribute("ssr", "");
		await page
			.getByRole("button", { name: "アカウントメニュー", exact: true })
			.click();
		await page
			.getByRole("menuitem", { name: "テーマ変更", exact: true })
			.click();
		await expect(page.locator("html")).toHaveClass(/dark/);
		await expect(page.getByRole("menu")).toHaveCount(0);
		await page
			.getByRole("button", { name: "アカウントメニュー", exact: true })
			.click();
		await page
			.getByRole("menuitem", { name: "テーマ変更", exact: true })
			.click();
		await expect(page.locator("html")).not.toHaveClass(/dark/);
		await expect(page.getByRole("menu")).toHaveCount(0);
		for (const width of [390, 320]) {
			await page.setViewportSize({ width, height: 844 });
			const scrollPosition = await page.evaluate(() => ({
				x: window.scrollX,
				y: window.scrollY,
			}));
			await page
				.getByRole("button", { name: "アカウントメニュー", exact: true })
				.click();
			await expect(
				page.getByRole("menuitem", { name: "通知", exact: true }),
			).toBeVisible();
			await expect(
				page.getByRole("menuitem", { name: "使い方", exact: true }),
			).toBeVisible();
			await expect(page.getByRole("menu")).toHaveCSS("opacity", "1");
			assert.deepEqual(
				(
					await page.getByRole("menu").locator("button").allTextContents()
				).slice(-2),
				["日本語", "Log out"],
				"言語選択をログアウトのすぐ上に表示する",
			);
			await page.screenshot({
				path: `/tmp/evame-account-menu-mobile-${width}.png`,
			});
			await page.getByRole("menuitem", { name: "通知", exact: true }).click();
			await expect(
				page.getByTestId("notifications-menu-content"),
			).toBeVisible();
			await expect
				.poll(
					async () => {
						const bounds = await page
							.getByTestId("notifications-menu-content")
							.boundingBox();
						return (
							bounds &&
							bounds.x >= 0 &&
							bounds.x + bounds.width <= width &&
							bounds.y >= 0 &&
							bounds.y + bounds.height <= 844
						);
					},
					{ message: "通知へ切り替えた後、モバイルの画面内へ再配置する" },
				)
				.toBe(true);
			await expect
				.poll(() =>
					page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })),
				)
				.toEqual(scrollPosition);
			await page.screenshot({
				path: `/tmp/evame-notifications-mobile-${width}.png`,
			});
			await page
				.getByRole("menuitem", {
					name: "アカウントメニューに戻る",
					exact: true,
				})
				.click();
			await expect(
				page.getByRole("menuitem", { name: "使い方", exact: true }),
			).toBeVisible();
			await expect
				.poll(() =>
					page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })),
				)
				.toEqual(scrollPosition);
			await page.keyboard.press("Escape");
			await expect(page.getByRole("menu")).toHaveCount(0);
		}
		await page.setViewportSize({ width: 390, height: 844 });
		let notificationsUnavailable = true;
		const notificationsRoute = async (route) => {
			if (route.request().method() === "GET" && notificationsUnavailable)
				await route.fulfill({
					status: 503,
					contentType: "application/json",
					body: "{}",
				});
			else await route.continue();
		};
		await page.route("**/api/notifications", notificationsRoute);
		await page.reload();
		await page
			.getByRole("button", { name: "アカウントメニュー", exact: true })
			.click();
		await page.getByRole("menuitem", { name: "通知", exact: true }).click();
		const notificationRetry = page.getByRole("menuitem", {
			name: "通知を読み込めませんでした。再試行",
			exact: true,
		});
		await expect(notificationRetry).toBeVisible();
		notificationsUnavailable = false;
		await notificationRetry.click();
		await expect(page.getByTestId("notifications-menu-content")).toContainText(
			"通知確認ユーザー",
		);
		await expect(page.getByTestId("notifications-menu-content")).toBeVisible();
		await page.unroute("**/api/notifications", notificationsRoute);
		await page.keyboard.press("Escape");
		assert.ok(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
			"ブログはモバイルで横にはみ出さない",
		);
		await page.screenshot({
			path: "/tmp/evame-blog-mobile.png",
			fullPage: true,
		});
		await page.setViewportSize({ width: 1280, height: 900 });
		assert.deepEqual(errors, [], "ブラウザーに未処理エラーがない");
		console.log(
			"本人プロフィール・Markdownダウンロードを維持し、ブラウザーの未処理エラーがない",
		);
		await page.goto(`${baseUrl}/ja/${handle}/page-management`);
		const exportButton = page.getByRole("button", {
			name: "Markdown＋画像を書き出す",
			exact: true,
		});
		await expect(exportButton).toBeVisible();
		const downloaded = page.waitForEvent("download", { timeout: 60000 });
		await exportButton.click();
		const download = await downloaded;
		assert.equal(await download.failure(), null);
		assert.equal(download.suggestedFilename(), "evame-export.zip");
		const archivePath = await download.path();
		assert.ok(archivePath);
		const zip = new ZipReader(
			new Uint8ArrayReader(new Uint8Array(await readFile(archivePath))),
			{ useWebWorkers: false },
		);
		try {
			const entries = await zip.getEntries();
			assert.ok(
				entries.filter((entry) => entry.filename.startsWith("documents/"))
					.length > 768,
				"管理画面の表示件数を超える全文書を書き出す",
			);
			const report = entries.find(
				(entry) => entry.filename === "export-report.json",
			);
			assert.ok(report && !report.directory);
			assert.equal(
				JSON.parse(await report.getData(new TextWriter())).images,
				1,
			);
		} finally {
			await zip.close();
		}
		await expect(exportButton).toBeEnabled();
		await page.screenshot({ path: "/tmp/evame-export-desktop.png" });
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(exportButton).toBeVisible();
		await page.screenshot({
			path: "/tmp/evame-export-mobile.png",
			fullPage: true,
		});
		assert.deepEqual(
			errors,
			[],
			"書き出し画面にもブラウザーの未処理エラーがない",
		);
		console.log(
			"文書管理画面からMarkdownと画像のZIPをダウンロードでき、デスクトップとモバイルで操作できる",
		);
		await context.close();
	} finally {
		await browser.close();
	}
}
