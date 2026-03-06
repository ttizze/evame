const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

export function getGoogleAuthOptions() {
	const googleAuthOptions = {
		projectId: process.env.GCP_PROJECT_ID,
		scopes: [CLOUD_PLATFORM_SCOPE],
	};
	const credentialsJson =
		process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_JSON ??
		(process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_BASE64
			? Buffer.from(
					process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS_BASE64,
					"base64",
				).toString("utf-8")
			: undefined);

	if (!credentialsJson) {
		return googleAuthOptions;
	}

	const credentials = JSON.parse(credentialsJson) as {
		type?: string;
		client_email?: string;
		private_key?: string;
		private_key_id?: string;
		project_id?: string;
		client_id?: string;
		client_secret?: string;
		refresh_token?: string;
		quota_project_id?: string;
		universe_domain?: string;
	};
	return {
		...googleAuthOptions,
		credentials,
	};
}
