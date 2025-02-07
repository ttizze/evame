// textraApi.ts

const MAX_RETRIES = 3;

/**
 * アクセストークンを取得する関数
 * @param apiKey - TexTraのAPI Key
 * @param apiSecret - TexTraのAPI Secret
 * @returns アクセストークン
 */
async function getTexTraAccessToken(
	apiKey: string,
	apiSecret: string,
): Promise<string> {
	// TexTraのOAuth2トークン取得エンドポイント
	const tokenUrl = "https://mt-auto-minhon-mlt.ucri.jgn-x.jp/oauth2/token.php";

	// リクエストパラメータ
	const body = new URLSearchParams({
		grant_type: "client_credentials",
		client_id: apiKey,
		client_secret: apiSecret,
		urlAccessToken: tokenUrl, // ドキュメントに合わせて設定
	});

	const response = await fetch(tokenUrl, {
		method: "POST",
		body,
	});

	if (!response.ok) {
		throw new Error(
			`Failed to get access token. HTTP Status: ${response.status}`,
		);
	}

	const data = await response.json();
	if (!data.access_token) {
		throw new Error("Failed to obtain access token from TexTra API.");
	}

	return data.access_token;
}

/**
 * TexTra APIを呼び出して翻訳を行う関数
 * @param apiKey - TexTraのAPI Key
 * @param apiSecret - TexTraのAPI Secret
 * @param loginID - TexTraのログインID (例: "tomolld")
 * @param text - 翻訳したい文
 * @returns 翻訳結果文字列
 */
export async function getTexTraTranslation(
	apiKey: string,
	apiSecret: string,
	loginID: string,
	text: string,
): Promise<string> {
	let lastError: Error | null = null;

	for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
		try {
			// 1. アクセストークン取得
			const accessToken = await getTexTraAccessToken(apiKey, apiSecret);

			// 2. 翻訳APIを呼び出す
			// 以下は「特許翻訳エンジン（英語→日本語）patentNT_en_ja」の例です。
			// 別エンジンを使う場合はURLやパラメータを置き換えてください。
			const translationUrl =
				"https://mt-auto-minhon-mlt.ucri.jgn-x.jp/api/mt/voicetraNT_ja_en/";

			// リクエストボディ
			const params = new URLSearchParams({
				access_token: accessToken,
				key: apiKey,
				name: loginID, // ログインID
				type: "json", // レスポンスタイプをJSONに
				text, // 翻訳対象テキスト
				// 必要に応じて他パラメータを追加
				// e.g. split: '1', history: '0' など
			});

			const response = await fetch(translationUrl, {
				method: "POST",
				body: params,
			});
			console.log("response", response);
			if (!response.ok) {
				throw new Error(
					`Translation API request failed. HTTP Status: ${response.status}`,
				);
			}

			const data = await response.json();

			return data.resultset.result.text;
		} catch (error) {
			lastError = error as Error;
			console.error(`Translation attempt ${retryCount + 1} failed:`, lastError);

			// リトライ回数が残っていれば少し待機後にリトライ
			if (retryCount < MAX_RETRIES - 1) {
				const delay = 1000 * (retryCount + 1);
				console.log(`Retrying in ${delay / 1000} seconds...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	console.error("Max retries reached. Translation failed.");
	throw lastError || new Error("Translation failed after max retries");
}

/**
 * TexTra APIキーが有効かどうかを判定するための関数
 * @param apiKey - TexTraのAPI Key
 * @param apiSecret - TexTraのAPI Secret
 * @param loginID - TexTraのログインID
 * @returns { isValid: boolean; errorMessage?: string }
 */
export async function validateTexTraApiKey(
	apiKey: string,
	apiSecret: string,
	loginID: string,
): Promise<{ isValid: boolean; errorMessage?: string }> {
	try {
		// テスト用テキストを翻訳してレスポンスが帰ってくるかで判定
		const testText = "Hello, World!";
		const result = await getTexTraTranslation(
			apiKey,
			apiSecret,
			loginID,
			testText,
		);

		if (result && result.length > 0) {
			// 正常に翻訳テキストが取得できた場合は有効とみなす
			return { isValid: true };
		}
		// 空文字が返るなど、翻訳結果がおかしい場合
		return {
			isValid: false,
			errorMessage: "No translation was returned.",
		};
	} catch (error) {
		console.error("TexTra API key validation failed:", error);

		// エラーメッセージの判定
		if (
			error instanceof Error &&
			error.message.includes("The model is currently overloaded")
		) {
			// みんなの翻訳 API には "model is overloaded" のようなメッセージは基本ありませんが、
			// 類するエラーメッセージがあればここで判定し、返すことができます。
			return {
				isValid: false,
				errorMessage:
					"The model is currently overloaded. Please try again later.",
			};
		}

		// それ以外のエラー
		return {
			isValid: false,
			errorMessage:
				"Failed to validate the API key. Please check your key and try again.",
		};
	}
}
