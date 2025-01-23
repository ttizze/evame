import { expect, test } from "@playwright/test";

test("Google OAuth でログインしてプロフィールページが表示される", async ({
	page,
}) => {
	// 1. アプリを起動してトップページへ
	await page.goto("http://localhost:3000");

	// 2. "Sign in with Google" ボタンをクリック
	await page.click("text=Signin with Google");

	await page.waitForURL("http://localhost:3000/");

	// 5. ログイン済みであれば、ユーザーのメールアドレスやプロフィールが表示されるはず
	await expect(page.getByText("testuser@gmail.com")).toBeVisible();
});
