import {
	deleteReaderCacheInvalidations,
	storeReaderCacheInvalidations,
} from "../../db/mutations";
import { fetchReaderCacheInvalidations } from "../../db/queries";
import { readerCacheTags } from "../_domain/reader-cache-tags";

export async function updateReaderPublication(
	changes: readonly { key: string }[],
	purge: (tags: string[]) => Promise<void>,
) {
	if (changes.length > 0)
		await storeReaderCacheInvalidations(
			await readerCacheTags(changes.map((row) => row.key)),
			crypto.randomUUID(),
		);
	const pending = await fetchReaderCacheInvalidations();
	if (pending.length === 0) return;
	await purge(
		pending
			.filter((row) => row.tag.startsWith("reader:"))
			.map((row) => row.tag),
	);
	// HTML用R2の廃止前に保留されたタグも、共有キャッシュの削除後に回収する。
	// 取得した版だけを消し、削除中に到着した後続変更は次回へ残す。
	await deleteReaderCacheInvalidations(pending);
}
