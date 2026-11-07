import { runTransaction } from "./transaction";

export async function storeReaderCacheInvalidations(
	tags: readonly string[],
	version: string,
) {
	await runTransaction(async (tx) => {
		for (let start = 0; start < tags.length; start += 100) {
			await tx
				.insertInto("readerCacheInvalidations")
				.values(tags.slice(start, start + 100).map((tag) => ({ tag, version })))
				.onConflict((conflict) =>
					conflict.column("tag").doUpdateSet({ version }),
				)
				.execute();
		}
	});
}

/** 削除完了を確認した版だけ消し、同じタグに重なった後続の変更を残す。 */
export async function deleteReaderCacheInvalidations(
	rows: readonly { tag: string; version: string }[],
) {
	await runTransaction(async (tx) => {
		for (let start = 0; start < rows.length; start += 100) {
			await tx
				.deleteFrom("readerCacheInvalidations")
				.where((eb) =>
					eb.or(
						rows
							.slice(start, start + 100)
							.map((row) =>
								eb.and([
									eb("tag", "=", row.tag),
									eb("version", "=", row.version),
								]),
							),
					),
				)
				.execute();
		}
	});
}
