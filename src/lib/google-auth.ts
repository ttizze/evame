// lib/googleAuth.ts ----------------------------------------------------------
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { ExternalAccountClient } from "google-auth-library";

export async function getAuthClient() {
	const oidc = getVercelOidcToken() || process.env.VERCEL_OIDC_TOKEN;

	return ExternalAccountClient.fromJSON({
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
}
