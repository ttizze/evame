import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { fromJSON } from "seroval";

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
		page.on("response", (response) => {
			const url = new URL(response.url());
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
		).toBeVisible();
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
		const newPageUrl = page.url().replace(/\/edit$/, "");
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
			page.locator("#comments .tiptap[contenteditable=true]").first(),
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
			page
				.getByRole("link", { name: "Edit page", exact: true })
				.locator("svg.lucide-pencil"),
		).toBeVisible();
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
		await page.screenshot({
			path: "/tmp/evame-ui-restored-article-desktop.png",
		});
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
		await expect(
			page.getByRole("button", { name: "Table of Contents", exact: true }),
		).toBeFocused();
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
		await page
			.getByRole("searchbox", { name: "検索", exact: true })
			.fill("Worker Test");
		await expect(
			page.locator(`main a[href="/ja/${handle}"]`).first(),
		).toBeVisible();
		await page.screenshot({ path: "/tmp/evame-ui-restored-search.png" });
		console.log("検索タブの切り替えと入力による検索結果の更新を維持する");
		const draftResponse = await page.request.get(
			`${baseUrl}/api/reader-data?${new URLSearchParams({ path: new URL(newPageUrl).pathname })}`,
		);
		const draft = fromJSON(await draftResponse.json());
		const newPageId = draft.page.data.pageDetail.id;
		const publishDraft = () =>
			page.request.post(`${baseUrl}/api/reader-actions?action=pageStatus`, {
				data: { locale: "ja", pageId: newPageId, operation: "togglePublish" },
			});
		assert.equal((await publishDraft()).status(), 200);
		await page.goto(`${baseUrl}/ja/${handle}`);
		const ownerCard = page.locator("main article").filter({
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
		await page
			.getByRole("button", { name: "Make Private", exact: true })
			.click();
		await expect(ownerCard).toHaveCount(0);
		assert.equal((await publishDraft()).status(), 200);
		await page.reload();
		await ownerCard
			.getByRole("button", { name: "More options", exact: true })
			.click();
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await page
			.getByRole("dialog", { name: "Delete Page" })
			.getByRole("button", { name: "Delete", exact: true })
			.click();
		await expect(ownerCard).toHaveCount(0);
		console.log(
			"本人プロフィールの記事メニューから編集先・非公開化・削除を操作できる",
		);
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
