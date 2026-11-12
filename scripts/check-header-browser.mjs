import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function checkHeaderBrowser(
	browser,
	baseUrl,
	cookie,
	handle,
	pageSlug,
) {
	const engine = browser.browserType().name();
	const guest = await browser.newContext({ colorScheme: "light" });
	try {
		const page = await guest.newPage();
		for (const [kind, path] of [
			["home", "/ja"],
			["profile", `/ja/${handle}`],
			["article", `/ja/${handle}/${pageSlug}`],
		]) {
			for (const width of [390, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`${baseUrl}${path}`);
				const header = page.locator("header");
				const language = header.getByRole("button", {
					name: "言語変更：日本語",
					exact: true,
				});
				const login = header.getByRole("button", {
					name: width < 768 ? "ログイン" : "Start",
					exact: true,
				});
				await expect(login).toBeVisible();
				if (kind === "article") {
					await expect(header.getByTestId("source-icon")).toBeAttached();
					if (width < 768)
						await expect(header.getByTestId("source-icon")).not.toBeVisible();
					else await expect(header.getByTestId("source-icon")).toBeVisible();
				}
				if (width < 768) {
					const icons = [];
					for (const control of [
						header.getByRole("button", { name: "使い方", exact: true }),
						header.getByRole("link", { name: "Search for pages", exact: true }),
						language,
						login,
					]) {
						await expect(control.locator("svg:visible")).toHaveCount(1);
						const box = await control.locator("svg:visible").boundingBox();
						assert.equal(box.width, 24);
						assert.equal(box.height, 24);
						icons.push(box);
					}
					assert.deepEqual(
						icons.map((box) => box.y),
						Array(4).fill(icons[0].y),
						"4アイコンの縦位置を揃える",
					);
					assert.ok(
						icons.every(
							(box, index) => index === 0 || box.x > icons[index - 1].x,
						),
						"使い方・検索・言語・ログインの順に並べる",
					);
					await expect(
						header.getByText("日本語", { exact: true }),
					).not.toBeVisible();
					await expect(
						header.getByText("Start", { exact: true }),
					).not.toBeVisible();
				} else {
					await expect(
						header.getByText("日本語", { exact: true }),
					).toBeVisible();
					await expect(
						header.getByText("Start", { exact: true }),
					).toBeVisible();
				}
				await language.click();
				await page.getByPlaceholder("search...", { exact: true }).fill("en");
				await expect(
					page.getByRole("option", { name: "English", exact: true }),
				).toBeVisible();
				await page.keyboard.press("Escape");
				await expect(page.getByRole("dialog")).toHaveCount(0);
				await login.click();
				await expect(
					page.getByRole("dialog").locator('input[type="email"]'),
				).toBeVisible();
				await page.keyboard.press("Escape");
				await expect(page.getByRole("dialog")).toHaveCount(0);
				assert.ok(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= innerWidth,
					),
				);
				await header.screenshot({
					path: `/tmp/evame-header-${engine}-guest-${kind}-${width}.png`,
				});
			}
		}
	} finally {
		await guest.close();
	}
	const member = await browser.newContext({ colorScheme: "light" });
	try {
		const separator = cookie.indexOf("=");
		await member.addCookies([
			{
				name: cookie.slice(0, separator),
				value: cookie.slice(separator + 1),
				url: baseUrl,
				httpOnly: true,
				sameSite: "Lax",
			},
		]);
		const page = await member.newPage();
		for (const [kind, path] of [
			["profile", `/ja/${handle}`],
			["article", `/ja/${handle}/${pageSlug}`],
		]) {
			await page.goto(`${baseUrl}${path}`);
			for (const width of [390, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				const account = page.getByRole("button", {
					name: "アカウントメニュー",
					exact: true,
				});
				await account.click();
				const menu = page.getByRole("menu");
				await expect(menu).toHaveCSS("opacity", "1");
				if (kind === "article")
					await expect(menu.getByTestId("source-icon")).toBeVisible();
				const positions = [];
				for (const name of [
					"通知",
					"使い方",
					"プロフィール・設定",
					"記事管理",
					"テーマ変更",
					"日本語",
					"Log out",
				]) {
					const item = menu.getByRole(
						name === "日本語" ? "button" : "menuitem",
						{ name, exact: true },
					);
					positions.push(
						await item.evaluate((element) => {
							const walker = document.createTreeWalker(
								element,
								NodeFilter.SHOW_TEXT,
							);
							for (
								let text = walker.nextNode();
								text;
								text = walker.nextNode()
							) {
								if (!text.textContent.trim()) continue;
								const range = document.createRange();
								range.selectNodeContents(text);
								return range.getBoundingClientRect().x;
							}
							throw new Error("表示する項目名がない");
						}),
					);
				}
				assert.deepEqual(
					positions,
					Array(positions.length).fill(positions[0]),
					"全項目の文字の左端を揃える",
				);
				assert.deepEqual(
					(await menu.locator("button").allTextContents()).slice(-2),
					["日本語", "Log out"],
				);
				await page.screenshot({
					path: `/tmp/evame-header-${engine}-${kind}-${width}.png`,
					clip:
						width === 390
							? { x: 0, y: 0, width, height: 480 }
							: { x: 256, y: 0, width: 768, height: 500 },
				});
				await menu
					.getByRole("menuitem", { name: "テーマ変更", exact: true })
					.click();
				await expect(page.locator("html")).toHaveClass(/dark/);
				await expect(page.getByRole("menu")).toHaveCount(0);
				await account.click();
				await page
					.getByRole("menuitem", { name: "テーマ変更", exact: true })
					.click();
				await expect(page.locator("html")).not.toHaveClass(/dark/);
				await expect(page.getByRole("menu")).toHaveCount(0);
			}
		}
	} finally {
		await member.close();
	}
	console.log(
		`${engine}: スマホの4アイコン・言語とログインの選択画面・メニューの左端・テーマ切替を確認`,
	);
}
