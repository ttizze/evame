"use client";
import { ArrowUpFromLine } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useLocale } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";

interface AddTranslationFormProps {
	segmentId: number;
	onTranslationAdded?: () => void;
}

export function AddTranslationForm({
	segmentId,
	onTranslationAdded,
}: AddTranslationFormProps) {
	const hydrated = useHydrated();
	const locale = useLocale();
	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;
	const formRef = useRef<HTMLFormElement>(null);
	const [addTranslationState, setAddTranslationState] =
		useState<ActionResponse>({
			success: false,
		});
	const [isAddingTranslation, setIsAddingTranslation] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsAddingTranslation(true);
		setAddTranslationState({ success: false });

		try {
			const response = await fetch("/api/segment-translations", {
				method: "POST",
				body: new FormData(event.currentTarget),
				credentials: "same-origin",
			});

			if (response.status === 401) {
				window.location.assign(`/${locale}/auth/login`);
				return;
			}

			const body = (await response.json()) as ActionResponse & {
				error?: string;
			};
			if (!response.ok) {
				setAddTranslationState({
					success: false,
					message: body.message ?? body.error,
					zodErrors: "zodErrors" in body ? body.zodErrors : undefined,
				});
				return;
			}

			setAddTranslationState(body);
			if (body.success) {
				onTranslationAdded?.();
				formRef.current?.reset();
			}
		} catch {
			setAddTranslationState({ success: false });
		} finally {
			setIsAddingTranslation(false);
		}
	};

	return (
		<span className="mt-4 px-4 block">
			<form onSubmit={handleSubmit} ref={formRef}>
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
					{!addTranslationState.success && addTranslationState.message && (
						<p className="text-red-500 text-sm">
							{addTranslationState.message}
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
