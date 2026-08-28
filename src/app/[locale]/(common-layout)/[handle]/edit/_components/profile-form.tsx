"use client";

import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, SaveIcon } from "lucide-react";
import Image from "next/image";
import { useLocale } from "next-intl";
import {
	type FormEvent,
	useEffect,
	useRef,
	useState,
	useTransition,
} from "react";
import { toast } from "sonner";
import { authClient } from "@/app/[locale]/_service/auth-client";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	updateProfile,
	updateProfileImage,
} from "@/routes/$locale/-profile-edit-data";
import type {
	ProfileEditState,
	ProfileImageEditState,
} from "../_service/profile-edit";

interface ProfileFormProps {
	currentUser: SanitizedUser;
	locale?: string;
}

export function ProfileForm({
	currentUser,
	locale: routeLocale,
}: ProfileFormProps) {
	const locale = useLocale();
	const resolvedLocale = routeLocale ?? locale;
	const router = useRouter();
	const updateProfileFn = useServerFn(updateProfile);
	const updateProfileImageFn = useServerFn(updateProfileImage);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isEditPending, startEditTransition] = useTransition();
	const [isImageUploading, startImageTransition] = useTransition();
	const [editState, setEditState] = useState<ProfileEditState>({
		success: true,
		data: {
			name: currentUser.name,
			profile: currentUser.profile || "",
			twitterHandle: currentUser.twitterHandle || "",
		},
	});
	const [imageState, setImageState] = useState<ProfileImageEditState>({
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
					image: imageState.data.imageUrl,
				});
			} else if (!imageState.success && imageState.message) {
				toast.error(imageState.message);
			}
		};

		void updateImageSession();
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

		void updateNameSession();
	}, [editState]);

	const handleImageClick = () => {
		fileInputRef.current?.click();
	};

	const handleImageSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const file = fileInputRef.current?.files?.[0];
		if (!file) {
			setImageState({ success: false, message: "No image provided" });
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			setImageState({
				success: false,
				message: "Image size exceeds 5MB limit. Please choose a smaller file.",
			});
			return;
		}

		const formData = new FormData(event.currentTarget);
		formData.set("image", file);
		formData.set("locale", resolvedLocale);
		startImageTransition(() => {
			void (async () => {
				const result = await updateProfileImageFn({ data: formData });
				setImageState(result);
				if (result.success) {
					await router.invalidate({ sync: true });
				}
			})();
		});
	};

	const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		formData.set("locale", resolvedLocale);
		startEditTransition(() => {
			void (async () => {
				const result = await updateProfileFn({ data: formData });
				setEditState(result);
				if (result.success) {
					await router.invalidate({ sync: true });
				}
			})();
		});
	};

	return (
		<div className="space-y-6">
			{/* ---------- Avatar ---------- */}
			<form className="space-y-4" onSubmit={handleImageSubmit}>
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
					onChange={(event) => {
						if (event.currentTarget.files?.[0]) {
							event.currentTarget.form?.requestSubmit();
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
			<form className="space-y-4" onSubmit={handleProfileSubmit}>
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
