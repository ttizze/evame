import { deleteReaderPublicationChanges } from "../../db/mutations";
import { fetchReaderPublicationChanges } from "../../db/queries";

export async function updateReaderPublication(
	publish: (changes: { key: string; revision: number }[]) => Promise<void>,
) {
	const pending = await fetchReaderPublicationChanges();
	if (pending.length === 0) return;
	await publish(pending);
	await deleteReaderPublicationChanges(pending);
}
