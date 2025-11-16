// lib/googleAuth.ts ----------------------------------------------------------
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { ExternalAccountClient } from "google-auth-library";

/**
 * Vercel環境ではOIDCトークンを使用し、ローカル開発ではundefinedを返して
 * Application Default Credentials (ADC) を自動的に使用する
 */
export async function getAuthClient(): Promise<
	ExternalAccountClient | undefined
> {
	// Vercel 環境でのみ OIDC を利用（環境変数の VERCEL_OIDC_TOKEN は無視）
	const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
	const oidc = isVercel ? getVercelOidcToken() : undefined;

	if (!oidc) {
		// ローカル開発時: undefined を返すことで、VertexAI が自動的に
		// Application Default Credentials を使用する
		// 事前に `gcloud auth application-default login` を実行しておく
		return undefined;
	}

	// Vercel 環境: OIDC トークンを使用
	const client = ExternalAccountClient.fromJSON({
		type: "external_account",
		audience:
			`//iam.googleapis.com/projects/${process.env.GCP_PROJECT_NUMBER}` +
			`/locations/global/workloadIdentityPools/${process.env.GCP_WORKLOAD_IDENTITY_POOL_ID}` +
			`/providers/${process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
		subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
		token_url: "https://sts.googleapis.com/v1/token",
		service_account_impersonation_url:
			`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
			`${process.env.GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
		subject_token_supplier: { getSubjectToken: () => oidc },
	});
	if (!client) throw new Error("authClient undefined");
	return client;
}
