import { signInWithGoogleAction } from "@/app/[locale]/auth-action";
import type { ActionState } from "@/app/types";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { FcGoogle } from "react-icons/fc";

export function GoogleForm({ redirectTo }: { redirectTo: string }) {
	const [state, formAction, isPending] = useActionState<ActionState, FormData>(
		signInWithGoogleAction,
		{},
	);
	return (
		<form action={formAction} className="w-full ">
			<input type="hidden" name="redirectTo" value={redirectTo} />
			<Button
				variant="outline"
				disabled={isPending}
				className="w-full rounded-full h-12 text-md"
			>
				<FcGoogle className="mr-2 h-6 w-6" />
				Google Login
			</Button>
		</form>
	);
}
