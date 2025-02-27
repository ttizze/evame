import dotenv from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { getGeoViewData } from "./view-data";

// テスト前に環境変数を読み込む
beforeAll(() => {
	// .env.test.local ファイルから環境変数を読み込む
	dotenv.config({ path: ".env" });

	// 必要な環境変数が設定されているか確認
	const requiredEnvVars = [
		"GOOGLE_CLIENT_EMAIL",
		"GOOGLE_PRIVATE_KEY",
		"GA4_PROPERTY_ID",
	];

	const missingVars = requiredEnvVars.filter(
		(varName) => !process.env[varName],
	);
	if (missingVars.length > 0) {
		console.warn(
			`警告: 以下の環境変数が設定されていません: ${missingVars.join(", ")}`,
		);
		console.warn("テストが失敗する可能性があります。");
	}
});

describe("Google Analytics Data API 接続テスト", () => {
	it("実際の GA4 API に接続してデータを取得できること", async () => {
		// テスト用のパスを指定（実際のサイトに存在するパスを使用）
		const testPath = "/test-path"; // 実際のサイトのパスに変更してください

		// API からデータを取得
		const result = await getGeoViewData(testPath); // 過去90日間のデータを取得

		// 接続が成功していることを確認
		expect(Array.isArray(result)).toBe(true);

		// データの構造が正しいことを確認
		if (result.length > 0) {
			expect(result[0]).toHaveProperty("country");
			expect(result[0]).toHaveProperty("views");
			expect(typeof result[0].country).toBe("string");
			expect(typeof result[0].views).toBe("number");
		}

		console.log("取得したデータ:", result);
	}, 10000); // タイムアウトを10秒に設定
});
