"use client";

import { Loader2, SaveIcon } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { authClient } from "@/app/[locale]/_service/auth-client";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type UserEditState, userEditAction } from "./user-edit-action";
import {
	type UserImageEditState,
	userImageEditAction,
} from "./user-image-edit-action";

interface ProfileFormProps {
	currentUser: SanitizedUser;
}

export function ProfileForm({ currentUser }: ProfileFormProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [editState, editAction, isEditPending] = useActionState<
		UserEditState,
		FormData
	>(userEditAction, {
		success: true,
		data: {
			name: currentUser.name,
			profile: currentUser.profile || "",
			twitterHandle: currentUser.twitterHandle || "",
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

	useEffect(() => {
		const updateImageSession = async () => {
			if (
				imageState.success &&
				imageState.data?.imageUrl &&
				imageState.message
			) {
				toast.success(imageState.message);
				await authClient.updateUser({
					image: imageState.data?.imageUrl,
				});
			} else if (!imageState.success && imageState.message) {
				toast.error(imageState.message);
			}
		};

		updateImageSession();
	}, [imageState]);

	useEffect(() => {
		const updateNameSession = async () => {
			if (editState.success && editState.message) {
				toast.success(editState.message);
				await authClient.updateUser({
					name: editState.data?.name,
				});
				return;
			}
			if (!editState.success) {
				const errorMessage =
					editState.zodErrors?.name?.[0] ??
					editState.zodErrors?.profile?.[0] ??
					editState.zodErrors?.twitterHandle?.[0] ??
					editState.zodErrors?.handle?.[0];
				if (errorMessage) {
					toast.error(errorMessage);
					return;
				}
				if (editState.message) {
					toast.error(editState.message);
				}
			}
		};

		updateNameSession();
	}, [editState]);

	const handleImageClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="space-y-6">
			{/* ---------- Avatar ---------- */}
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
						className="w-40 h-40 rounded-full overflow-hidden focus:outline-hidden focus:ring-2 focus:ring-blue-500 relative"
						disabled={isImageUploading}
						onClick={handleImageClick}
						type="button"
					>
						<Image
							alt="Profile"
							className="transition-opacity group-hover:opacity-75"
							height={160}
							src={
								imageState.success
									? imageState.data?.imageUrl
									: currentUser.image
							}
							width={160}
						/>
						<span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
							Change Image
						</span>
					</button>
				</div>
				<Input
					accept="image/*"
					className="hidden"
					name="image"
					onChange={() => {
						const form = fileInputRef.current?.form;
						if (form) {
							form.requestSubmit();
						}
					}}
					ref={fileInputRef}
					type="file"
				/>
				{imageState.success === false && (
					<div className="text-red-500 text-sm mt-1">{imageState.message}</div>
				)}
			</form>

			{/* ---------- Profile info ---------- */}
			<form action={editAction} className="space-y-4">
				<input name="handle" type="hidden" value={currentUser.handle} />
				<div>
					<Label>Display Name</Label>
					<Input
						className="w-full h-10 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={editState.success ? editState.data?.name : ""}
						maxLength={25}
						minLength={3}
						name="name"
						required
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
						className="w-full h-32 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={editState.success ? editState.data?.profile : ""}
						name="profile"
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
						className="w-full h-10 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={
							editState.success ? editState.data?.twitterHandle : ""
						}
						name="twitterHandle"
						pattern="@[A-Za-z0-9_]+"
						placeholder="start with @. e.g. @evame"
					/>
					{!editState.success && editState.zodErrors?.twitterHandle && (
						<div className="text-red-500 text-sm mt-1">
							{editState.zodErrors.twitterHandle}
						</div>
					)}
				</div>
				<Button className="w-full h-10" disabled={isEditPending} type="submit">
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
