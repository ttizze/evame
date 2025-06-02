"use client";

import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, SaveIcon } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
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
		if (imageState.success && imageState.data?.imageUrl && imageState.message) {
			toast.success(imageState.message);
		} else if (!imageState.success && imageState.message) {
			toast.error(imageState.message);
		}
	}, [imageState]);

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
						type="button"
						onClick={handleImageClick}
						disabled={isImageUploading}
						className="w-40 h-40 rounded-full overflow-hidden focus:outline-hidden focus:ring-2 focus:ring-blue-500 relative"
					>
						<Image
							src={
								imageState.success
									? imageState.data?.imageUrl
									: currentUser.image
							}
							alt="Profile"
							width={160}
							height={160}
							className="transition-opacity group-hover:opacity-75"
						/>
						<span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
							Change Image
						</span>
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
					<div className="text-red-500 text-sm mt-1">{imageState.message}</div>
				)}
			</form>

			{/* ---------- Profile info ---------- */}
			<form action={editAction} className="space-y-4">
				<input type="hidden" name="handle" value={currentUser.handle} />
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
