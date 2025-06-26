import { signInWithGoogleAction } from "@/app/[locale]/auth-action";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";
import Form from "next/form";
import { useActionState } from "react";
import { FcGoogle } from "react-icons/fc";

export function GoogleForm({ redirectTo }: { redirectTo: string }) {
	const [, formAction, isPending] = useActionState<ActionResponse, FormData>(
		signInWithGoogleAction,
		{ success: false },
	);
	return (
		<Form action={formAction} className="w-full ">
			<input type="hidden" name="redirectTo" value={redirectTo} />
			<Button
				variant="default"
				disabled={isPending}
				className="w-full rounded-full h-12 text-md"
			>
				<FcGoogle className="mr-2 h-6 w-6" />
				Google Login
			</Button>
		</Form>
	);
}
