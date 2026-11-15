import type { R2Bucket } from "@cloudflare/workers-types";

// 待機中の更新は記事ごとに最新の版だけを残す。永続化の完了までは成功を返さない。
const pending = new Map<
	string,
	{
		revision: number;
		digest: string;
		body: string;
		promise: Promise<number>;
	}
>();

export function schedulePublication(
	bucket: R2Bucket,
	key: string,
	revision: number,
	digest: string,
	body: string,
) {
	const waiting = pending.get(key);
	if (waiting) {
		if (revision === waiting.revision && digest !== waiting.digest)
			return Promise.resolve(409);
		if (revision > waiting.revision)
			Object.assign(waiting, { revision, digest, body });
		return waiting.promise;
	}
	const { promise, resolve } = Promise.withResolvers<number>();
	const batch = { revision, digest, body, promise };
	pending.set(key, batch);
	void (async () => {
		try {
			await new Promise((done) => setTimeout(done, 1000));
			let current = await bucket.head(key);
			if (current && Date.now() - current.uploaded.getTime() < 1000) {
				const delay = 1000 - (Date.now() - current.uploaded.getTime());
				await new Promise((done) => setTimeout(done, delay));
				current = await bucket.head(key);
			}
			// ここから書き込み中の要求には、次の1秒の待機枠を使う。
			pending.delete(key);
			const { revision: latest, digest: hash, body: html } = batch;
			if (current) {
				const previous = Number(current.customMetadata?.revision);
				if (!Number.isSafeInteger(previous)) {
					resolve(503);
					return;
				}
				if (
					latest < previous ||
					(latest === previous && hash !== current.customMetadata?.digest)
				) {
					resolve(409);
					return;
				}
				if (latest === previous) {
					resolve(204);
					return;
				}
				if (Date.now() - current.uploaded.getTime() < 1000) {
					resolve(429);
					return;
				}
			}
			const stored = await bucket.put(key, html, {
				onlyIf: current
					? { etagMatches: current.etag }
					: { etagDoesNotMatch: "*" },
				httpMetadata: { contentType: "application/json" },
				customMetadata: { revision: String(latest), digest: hash },
			});
			resolve(stored ? 204 : 429);
		} catch (error) {
			console.error(error);
			resolve(503);
		} finally {
			if (pending.get(key) === batch) pending.delete(key);
		}
	})();
	return promise;
}
