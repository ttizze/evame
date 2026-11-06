import type { R2Bucket, R2PutOptions } from "@cloudflare/workers-types";

// 公開一覧・本文・生成元の更新で、同じ条件付き書き込みを再試行する。
export async function putReaderObject(
	bucket: R2Bucket,
	key: string,
	value: string | Uint8Array,
	options: R2PutOptions,
) {
	for (let attempt = 0; ; attempt++) {
		try {
			return await bucket.put(key, value, options);
		} catch (error) {
			if (
				attempt === 4 ||
				typeof error !== "object" ||
				error === null ||
				!("code" in error) ||
				error.code !== 10058
			)
				throw error;
			await new Promise((resolve) =>
				setTimeout(resolve, 1000 * 2 ** attempt + Math.random() * 250),
			);
		}
	}
}
