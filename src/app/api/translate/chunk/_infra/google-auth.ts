import { importPKCS8, SignJWT } from "jose";

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getGoogleAccessToken(): Promise<string> {
	if (cachedToken && cachedToken.expiresAt > Date.now())
		return cachedToken.value;
	let credentials: { client_email: string; private_key: string };
	try {
		credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS ?? "");
		if (
			typeof credentials.client_email !== "string" ||
			!credentials.client_email ||
			typeof credentials.private_key !== "string" ||
			!credentials.private_key
		)
			throw new Error();
	} catch {
		throw new Error(
			"GCP service account credentials are not configured correctly",
		);
	}
	const key = await importPKCS8(credentials.private_key, "RS256");
	const assertion = await new SignJWT({
		scope: "https://www.googleapis.com/auth/cloud-platform",
	})
		.setProtectedHeader({ alg: "RS256" })
		.setIssuer(credentials.client_email)
		.setAudience("https://oauth2.googleapis.com/token")
		.setIssuedAt()
		.setExpirationTime("1h")
		.sign(key);
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion,
		}),
	});
	if (!response.ok)
		throw new Error(`Google authentication failed (${response.status})`);
	const token = (await response.json()) as {
		access_token: string;
		expires_in: number;
	};
	if (
		typeof token.access_token !== "string" ||
		!token.access_token ||
		typeof token.expires_in !== "number" ||
		!Number.isFinite(token.expires_in) ||
		token.expires_in <= 0
	) {
		throw new Error("Google authentication returned an invalid token");
	}
	cachedToken = {
		value: token.access_token,
		expiresAt: Date.now() + (token.expires_in - 60) * 1000,
	};
	return token.access_token;
}
