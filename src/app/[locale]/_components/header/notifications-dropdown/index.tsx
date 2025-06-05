import { NotificationsDropdownClient } from "./client";
import { getNotifications } from "./db/queries.server";

export default async function NotificationsDropdown({
	currentUserHandle,
}: {
	currentUserHandle: string;
}) {
	const notifications = await getNotifications(currentUserHandle);

	return (
		<NotificationsDropdownClient
			notifications={notifications}
			currentUserHandle={currentUserHandle}
		/>
	);
}
