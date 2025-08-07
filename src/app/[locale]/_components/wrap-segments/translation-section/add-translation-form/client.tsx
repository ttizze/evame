"use client";
import { ArrowUpFromLine } from "lucide-react";
import { useLocale } from "next-intl";
import { useActionState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { StartButton } from "@/app/[locale]/_components/start-button";
import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { addTranslationFormAction } from "./action";

interface AddTranslationFormProps {
	segmentId: number;
	targetContentType: TargetContentType;
}

export function AddTranslationForm({
	segmentId,
	targetContentType,
}: AddTranslationFormProps) {
	const locale = useLocale();
	const { data: session } = authClient.useSession();
	const currentUser = session?.user;
	const [addTranslationState, addTranslationAction, isAddingTranslation] =
		useActionState<ActionResponse, FormData>(addTranslationFormAction, {
			success: false,
		});

	return (
		<span className="mt-4 px-4 block">
			<form action={addTranslationAction}>
				<input
					name="targetContentType"
					type="hidden"
					value={targetContentType}
				/>
				<input name="segmentId" type="hidden" value={segmentId} />
				<input name="locale" type="hidden" value={locale} />
				<span className="relative">
					<TextareaAutosize
						className={`w-full mb-2 rounded-xl p-2 text-base! border border-gray-500 bg-background resize-none overflow-hidden ${!currentUser && "bg-muted"}`}
						disabled={!currentUser}
						minRows={3}
						name="text"
						placeholder="Or enter your translation..."
						required
					/>
					{!currentUser && (
						<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
					)}
				</span>
				<span className="space-x-2 flex justify-end items-center">
					{!addTranslationState.success &&
						addTranslationState.zodErrors?.text && (
							<p className="text-red-500 text-sm">
								{addTranslationState.zodErrors.text}
							</p>
						)}
					<Button
						className="rounded-xl"
						disabled={isAddingTranslation || !currentUser}
						type="submit"
					>
						<ArrowUpFromLine className="h-4 w-4" />
						Submit
					</Button>
				</span>
			</form>
		</span>
	);
}
