import { BetaAnalyticsDataClient } from "@google-analytics/data";

// 環境変数から認証情報とプロパティIDを取得
const GOOGLE_ANALYTICS_CREDENTIALS_BASE64 =
	process.env.GOOGLE_ANALYTICS_CREDENTIALS_BASE64;
const GOOGLE_ANALYTICS_PROPERTY_ID = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

interface PageViewData {
	pagePath: string;
	screenPageViews: number;
}

export async function getPageViews(startDate: string, endDate: string) {
	if (!GOOGLE_ANALYTICS_CREDENTIALS_BASE64 || !GOOGLE_ANALYTICS_PROPERTY_ID) {
		throw new Error(
			"Google Analytics認証情報またはプロパティIDが設定されていません。",
		);
	}

	try {
		const credentials = JSON.parse(
			Buffer.from(GOOGLE_ANALYTICS_CREDENTIALS_BASE64, "base64").toString(
				"ascii",
			),
		);
		const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
		const [response] = await analyticsDataClient.runReport({
			property: `properties/${GOOGLE_ANALYTICS_PROPERTY_ID}`,
			dateRanges: [{ startDate, endDate }],
			dimensions: [{ name: "pagePath" }],
			metrics: [{ name: "screenPageViews" }],
		});

		if (!response || !response.rows) return null;

		const pageViewData: PageViewData[] = [];

		for (const row of response.rows) {
			if (row.dimensionValues && row.metricValues) {
				pageViewData.push({
					pagePath: row.dimensionValues[0].value || "",
					screenPageViews: Number.parseInt(
						row.metricValues[0].value || "0",
						10,
					),
				});
			}
		}

		return pageViewData;
	} catch (error) {
		console.error(
			"Google Analyticsのデータ取得中にエラーが発生しました:",
			error,
		);
	}
}
