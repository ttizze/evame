import { useActionState, useId } from "react";
import { callReaderAction } from "@/app/_service/reader-action";
import { Button } from "@/components/ui/button";
import { messages } from "@/i18n/messages";

export function FollowButtonClient({
	targetUserId,
	isFollowing,
	locale,
}: {
	targetUserId: string;
	isFollowing: boolean;
	locale: string;
}) {
	const t = (messages[locale as keyof typeof messages] ?? messages.en).Reader;
	const descriptionId = useId();
	const [state, formAction, isPending] = useActionState(
		async (
			previousState: { isFollowing: boolean; failed: boolean },
			formData: FormData,
		) => {
			const action =
				formData.get("action") === "unFollow" ? "unFollow" : "follow";
			try {
				const response = await callReaderAction("follow", {
					action,
					locale,
					targetUserId,
				});
				return response.success
					? { isFollowing: response.data.isFollowing, failed: false }
					: { ...previousState, failed: true };
			} catch {
				return { ...previousState, failed: true };
			}
		},
		{ isFollowing, failed: false },
	);

	return (
		<form action={formAction} className="mt-4 space-y-2">
			<input
				name="action"
				type="hidden"
				value={state.isFollowing ? "unFollow" : "follow"}
			/>
			<Button
				aria-describedby={descriptionId}
				className="rounded-full"
				disabled={isPending}
				variant={state.isFollowing ? "outline" : "default"}
			>
				{state.isFollowing ? t.unsubscribe : t.subscribe}
			</Button>
			<p className="text-sm text-muted-foreground" id={descriptionId}>
				{t.subscriptionHint}
			</p>
			{state.failed && <p role="alert">{t.subscriptionError}</p>}
		</form>
	);
}
