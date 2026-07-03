// lib/googleAuth.ts ----------------------------------------------------------
import { type AuthClient, GoogleAuth } from "google-auth-library";

/**
 * GCP_SERVICE_ACCOUNT_KEY (サービスアカウントキーの JSON 文字列) が設定されていれば
 * それを使う。既存環境の Base64 形式 secret も Cloudflare 移行後にそのまま使える。
 * どちらも無ければ undefined を返して Application Default Credentials (ADC) に任せる。
 *
 * Cloudflare Workers では `wrangler secret put GCP_SERVICE_ACCOUNT_KEY` で登録する。
 */
export async function getAuthClient(): Promise<AuthClient | undefined> {
	const keyJson =
		process.env.GCP_SERVICE_ACCOUNT_KEY ||
		(process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_BASE64
			? atob(process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_BASE64)
			: undefined);

	if (!keyJson) {
		// ローカル開発時: undefined を返すことで、VertexAI が自動的に
		// Application Default Credentials を使用する
		// 事前に `gcloud auth application-default login` を実行しておく
		return undefined;
	}

	const auth = new GoogleAuth({
		credentials: JSON.parse(keyJson),
		scopes: ["https://www.googleapis.com/auth/cloud-platform"],
	});
	return auth.getClient();
}
