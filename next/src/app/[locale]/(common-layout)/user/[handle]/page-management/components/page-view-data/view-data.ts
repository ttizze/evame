import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { unstable_cache } from "next/cache";
export interface GeoViewData {
	country: string;
	views: number;
}
function getCredentialsFromBase64() {
	try {
		const base64Credentials = process.env.GOOGLE_ANALYTICS_CREDENTIALS_BASE64;
		if (!base64Credentials) {
			throw new Error("GOOGLE_ANALYTICS_CREDENTIALS_BASE64 is not defined");
		}

		// Base64をデコードしてJSONに変換
		const decodedCredentials = Buffer.from(
			base64Credentials,
			"base64",
		).toString("utf-8");
		return JSON.parse(decodedCredentials);
	} catch (error) {
		console.error("Failed to parse Google credentials:", error);
		throw new Error("Invalid Google credentials format");
	}
}

// Google Analytics データ取得関数
export const getGeoViewData = (path: string) =>
	unstable_cache(
		async (): Promise<GeoViewData[]> => {
			try {
				// サービスアカウント認証と Analytics Data クライアントの初期化
				const analyticsDataClient = new BetaAnalyticsDataClient({
					credentials: getCredentialsFromBase64(),
				});

				// 地域別ページビューデータを取得
				const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

				if (!propertyId) {
					throw new Error("GA4_PROPERTY_ID is not defined");
				}

				const [response] = await analyticsDataClient.runReport({
					property: `properties/${propertyId}`,
					dateRanges: [{ startDate: "420daysAgo", endDate: "today" }],
					dimensions: [{ name: "country" }],
					metrics: [{ name: "screenPageViews" }],
					dimensionFilter: {
						filter: {
							fieldName: "pagePath",
							stringFilter: {
								matchType: "CONTAINS",
								value: path,
							},
						},
					},
					orderBys: [
						{
							metric: { metricName: "screenPageViews" },
							desc: true,
						},
					],
					limit: 10,
				});

				// データを整形
				return (
					response.rows?.map((row) => ({
						country: row.dimensionValues?.[0].value || "",
						views: Number(row.metricValues?.[0].value || "0"),
					})) || []
				);
			} catch (error) {
				console.error("Analytics API error:", error);
				return [];
			}
		},
		["geo-view-data", path],
		{
			revalidate: 3600, // 1時間でキャッシュを再検証
			tags: ["analytics-data"],
		},
	);
