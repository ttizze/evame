import { BetaAnalyticsDataClient } from "@google-analytics/data";

export interface GeoViewData {
	country: string;
	views: number;
}

// Google Analytics データ取得関数
export async function getGeoViewData(path: string): Promise<GeoViewData[]> {
	try {
		// サービスアカウント認証と Analytics Data クライアントの初期化
		const analyticsDataClient = new BetaAnalyticsDataClient({
			credentials: {
				client_email: process.env.GOOGLE_CLIENT_EMAIL,
				private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
			},
		});

		// 地域別ページビューデータを取得
		const propertyId = process.env.GA4_PROPERTY_ID;

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
}
