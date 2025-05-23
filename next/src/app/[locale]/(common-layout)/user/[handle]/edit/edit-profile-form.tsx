"use client";

import { GeminiApiKeyDialog } from "@/app/[locale]/_components/gemini-api-key-dialog/gemini-api-key-dialog";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, SaveIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useActionState } from "react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { type UserEditState, userEditAction } from "./user-edit-action";
import {
	type UserImageEditState,
	userImageEditAction,
} from "./user-image-edit-action";
interface EditProfileFormProps {
	currentUser: SanitizedUser;
}

export function EditProfileForm({ currentUser }: EditProfileFormProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [editState, editAction, isEditPending] = useActionState<
		UserEditState,
		FormData
	>(userEditAction, {
		success: true,
		data: {
			name: currentUser.name,
			profile: currentUser.profile,
			twitterHandle: currentUser.twitterHandle,
		},
	});
	const [imageState, imageAction, isImageUploading] = useActionState<
		UserImageEditState,
		FormData
	>(userImageEditAction, {
		success: true,
		data: {
			imageUrl: currentUser.image,
		},
	});
	const [showHandleInput, setShowHandleInput] = useState(false);
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
	const [profileIconUrl, setProfileIconUrl] = useState<string>(
		currentUser.image,
	);

	useEffect(() => {
		if (imageState.success && imageState.data?.imageUrl) {
			setProfileIconUrl(imageState.data.imageUrl);
			toast.success(imageState.message);
		}
	}, [imageState]);

	useEffect(() => {
		if (editState.success) {
			toast.success(editState.message);
		}
	}, [editState]);

	const handleImageClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div>
			<div>
				<form
					action={async (formData: FormData) => {
						const file = fileInputRef.current?.files?.[0];
						if (file) {
							const MAX_SIZE = 5 * 1024 * 1024; // 5MB
							if (file.size > MAX_SIZE) {
								toast.error(
									"Image size exceeds 5MB limit. Please choose a smaller file.",
								);
								return;
							}
							formData.set("image", file);
							await imageAction(formData);
						}
					}}
					className="space-y-4"
				>
					<div className="mt-3">
						<Label>Icon</Label>
					</div>
					<div className="relative group">
						<button
							type="button"
							onClick={handleImageClick}
							disabled={isImageUploading}
							className="w-40 h-40 rounded-full overflow-hidden focus:outline-hidden focus:ring-2 focus:ring-blue-500"
						>
							<Image
								src={
									imageState.success ? (imageState.data?.imageUrl ?? "") : ""
								}
								alt="Profile"
								width={160}
								height={160}
								className="transition-opacity group-hover:opacity-75"
							/>
							<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all">
								<span className="text-white opacity-0 group-hover:opacity-100">
									Change Image
								</span>
							</div>
						</button>
					</div>
					<Input
						ref={fileInputRef}
						type="file"
						name="image"
						accept="image/*"
						onChange={() => {
							const form = fileInputRef.current?.form;
							if (form) {
								form.requestSubmit();
							}
						}}
						className="hidden"
					/>
					{imageState.success === false && (
						<div className="text-red-500 text-sm mt-1">
							{imageState.message}
						</div>
					)}
				</form>
			</div>
			<form action={editAction} className="space-y-4">
				<div>
					<Label>User Name</Label>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<span className="text-sm">Current URL:</span>
							<code className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
								evame.tech/user/{currentUser.handle}
							</code>
						</div>
						<div className="space-y-1 text-sm text-amber-500">
							<p>⚠️ Important: Changing your handle will:</p>
							<ul className="list-disc list-inside pl-4 space-y-1">
								<li>Update all URLs of your page</li>
								<li>Break existing links to your page</li>
								<li>Allow your current handle to be claimed by others</li>
							</ul>
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowHandleInput(!showHandleInput)}
						>
							{showHandleInput ? "Cancel" : "Edit Handle"}
						</Button>
					</div>

					<code
						className={cn(
							"flex items-center gap-2 px-2 mt-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg",
							showHandleInput ? "block" : "hidden",
						)}
					>
						evame.tech/
						<Input
							defaultValue={currentUser.handle}
							name="handle"
							minLength={3}
							maxLength={25}
							required
							className="border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						/>
					</code>
					{!editState.success && editState.zodErrors?.handle && (
						<div className="text-red-500 text-sm mt-1">
							{editState.zodErrors.handle}
						</div>
					)}
				</div>

				<div>
					<Label>Display Name</Label>
					<Input
						defaultValue={editState.success ? editState.data?.name : ""}
						name="name"
						minLength={3}
						maxLength={25}
						required
						className="w-full h-10 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
					/>
					{!editState.success && editState.zodErrors?.name && (
						<div className="text-red-500 text-sm mt-1">
							{editState.zodErrors.name}
						</div>
					)}
				</div>

				<div>
					<Label>Profile</Label>
					<textarea
						defaultValue={editState.success ? editState.data?.profile : ""}
						name="profile"
						className="w-full h-32 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
					/>
					{!editState.success && editState.zodErrors?.profile && (
						<div className="text-red-500 text-sm mt-1">
							{editState.zodErrors.profile}
						</div>
					)}
				</div>
				<div>
					<Label>Twitter Handle</Label>
					<Input
						defaultValue={
							editState.success ? editState.data?.twitterHandle : ""
						}
						name="twitterHandle"
						placeholder="start with @. e.g. @evame"
						pattern="@[A-Za-z0-9_]+"
						className="w-full h-10 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
					/>
					{!editState.success && editState.zodErrors?.twitterHandle && (
						<div className="text-red-500 text-sm mt-1">
							{editState.zodErrors.twitterHandle}
						</div>
					)}
				</div>
				<Label>Gemini API Key</Label>
				<Button
					type="button"
					onClick={() => setIsApiKeyDialogOpen(true)}
					className="w-full"
				>
					Set API Key
				</Button>
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
		</div>
	);
}
