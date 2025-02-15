import type { AddTranslationFormTarget } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { StartButton } from "@/app/[locale]/components/start-button";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";
import { ArrowUpFromLine } from "lucide-react";
import { useLocale } from "next-intl";
import { useActionState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { addTranslationFormAction } from "./action";

interface AddTranslationFormProps {
	segmentId: number;
	currentHandle: string | undefined;
	addTranslationFormTarget: AddTranslationFormTarget;
}

export function AddTranslationForm({
	segmentId,
	currentHandle,
	addTranslationFormTarget,
}: AddTranslationFormProps) {
	const locale = useLocale();
	const [addTranslationState, addTranslationAction, isAddingTranslation] =
		useActionState<ActionResponse, FormData>(addTranslationFormAction, {
			success: false,
		});

	return (
		<span className="mt-4 px-4 block">
			<form action={addTranslationAction}>
				<input
					type="hidden"
					name="addTranslationFormTarget"
					value={addTranslationFormTarget}
				/>
				<input type="hidden" name="segmentId" value={segmentId} />
				<input type="hidden" name="locale" value={locale} />
				<span className="relative">
					<TextareaAutosize
						name="text"
						required
						className={`w-full mb-2 rounded-xl p-2 !text-base border border-gray-500 bg-background resize-none overflow-hidden ${!currentHandle && "bg-muted"}`}
						placeholder="Or enter your translation..."
						disabled={!currentHandle}
						minRows={3}
					/>
					{!currentHandle && (
						<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
					)}
				</span>
				<span className="space-x-2 flex justify-end items-center">
					{addTranslationState.zodErrors?.text && (
						<p className="text-red-500 text-sm">
							{addTranslationState.zodErrors.text}
						</p>
					)}
					<Button
						type="submit"
						className="rounded-xl"
						disabled={isAddingTranslation || !currentHandle}
					>
						<ArrowUpFromLine className="h-4 w-4" />
						Submit
					</Button>
				</span>
			</form>
		</span>
	);
}
