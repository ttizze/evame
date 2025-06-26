"use client";

import { GeminiApiKeyDialog } from "@/app/[locale]/_components/gemini-api-key-dialog/gemini-api-key-dialog";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, SaveIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { type UserEditState, userEditAction } from "./user-edit-action";

interface SettingsFormProps {
	currentUser: SanitizedUser;
}

export function SettingsForm({ currentUser }: SettingsFormProps) {
	const [showHandleInput, setShowHandleInput] = useState(false);
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

	const [editState, editAction, isEditPending] = useActionState<
		UserEditState,
		FormData
	>(userEditAction, {
		success: true,
		data: {
			name: currentUser.name,
		},
	});

	useEffect(() => {
		if (editState.success && editState.message) {
			toast.success(editState.message);
		} else if (
			!editState.success &&
			editState.message &&
			!editState.zodErrors
		) {
			toast.error(editState.message);
		}
	}, [editState]);

	return (
		<form action={editAction} className="space-y-4">
			<input type="hidden" name="name" value={currentUser.name} />
			{currentUser.profile && (
				<input type="hidden" name="profile" value={currentUser.profile} />
			)}
			{currentUser.twitterHandle && (
				<input
					type="hidden"
					name="twitterHandle"
					value={currentUser.twitterHandle}
				/>
			)}

			<div className="space-y-4">
				<div>
					<Label htmlFor="handle" className="text-base font-medium mb-2 block">
						Handle
					</Label>
					<div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
						<div className="flex items-center justify-between">
							<code className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-mono">
								evame.tech/user/{currentUser.handle}
							</code>
							<Button
								type="button"
								variant="outline"
								onClick={() => setShowHandleInput(!showHandleInput)}
							>
								{showHandleInput ? "Cancel" : "Edit"}
							</Button>
						</div>

						{showHandleInput && (
							<div className="space-y-3">
								<div className="space-y-1 text-sm text-amber-500">
									<p>⚠️ Important: Changing your handle will:</p>
									<ul className="list-disc list-inside pl-4 space-y-1">
										<li>Update all URLs of your page</li>
										<li>Break existing links to your page</li>
										<li>Allow your current handle to be claimed by others</li>
									</ul>
								</div>

								<div className="space-y-2">
									<Label htmlFor="handle-input" className="text-sm font-medium">
										New handle
									</Label>
									<div className="flex items-center gap-2">
										<code className="text-sm text-gray-600 dark:text-gray-400">
											evame.tech/user/
										</code>
										<Input
											id="handle-input"
											defaultValue={currentUser.handle}
											name="handle"
											minLength={3}
											maxLength={25}
											required
											className="flex-1 max-w-[200px]"
											placeholder="your-handle"
										/>
									</div>
									{!editState.success && editState.zodErrors?.handle && (
										<p className="text-red-500 text-sm">
											{editState.zodErrors.handle}
										</p>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<Label className="text-base font-medium">Gemini API Key</Label>
				<Button
					type="button"
					onClick={() => setIsApiKeyDialogOpen(true)}
					className="w-full"
					variant="outline"
				>
					Set API Key
				</Button>
			</div>
			<GeminiApiKeyDialog
				isOpen={isApiKeyDialogOpen}
				onOpenChange={setIsApiKeyDialogOpen}
			/>

			<Button type="submit" className="w-full h-10" disabled={isEditPending}>
				{isEditPending ? (
					<Loader2 className="w-6 h-6 animate-spin" />
				) : (
					<span className="flex items-center gap-2">
						<SaveIcon className="w-6 h-6" />
						Save
					</span>
				)}
			</Button>
		</form>
	);
}
