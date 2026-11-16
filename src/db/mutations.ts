import { runTransaction } from "./transaction";

/** R2へ反映した版だけ消し、同じキーに重なった後続の更新を残す。 */
export async function deleteReaderPublicationChanges(
	rows: readonly { key: string; revision: number }[],
) {
	await runTransaction(async (tx) => {
		for (let start = 0; start < rows.length; start += 100) {
			await tx
				.deleteFrom("readerPublicationChanges")
				.where((eb) =>
					eb.or(
						rows
							.slice(start, start + 100)
							.map((row) =>
								eb.and([
									eb("key", "=", row.key),
									eb("revision", "=", row.revision),
								]),
							),
					),
				)
				.execute();
		}
	});
}
