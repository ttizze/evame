"use client";

import { uploadImage } from "@/app/[locale]/_lib/upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ProjectImage } from "../../_db/mutations.server";

interface ProjectImageInputProps {
	initialImages: ProjectImage[];
	onChange: (images: ProjectImage[]) => void;
	maxImages?: number;
	hideReorder?: boolean;
	showCaption?: boolean;
}

export function ProjectImageInput({
	initialImages,
	onChange,
	maxImages = 10,
	hideReorder = false,
	showCaption = true,
}: ProjectImageInputProps) {
	/* --- state --- */
	const [images, setImages] = useState<ProjectImage[]>(
		[...initialImages].sort((a, b) => a.order - b.order),
	);
	const [isPending, startTransition] = useTransition();
	const fileInputRef = useRef<HTMLInputElement>(null);

	/* --- 親への通知 --- */
	useEffect(() => onChange(images), [images, onChange]);

	const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			alert("画像ファイルを選択してください");
			return;
		}
		if (images.length >= maxImages) {
			alert(`画像は最大 ${maxImages} 枚までです`);
			return;
		}

		// アップロード開始
		startTransition(async () => {
			const res = await uploadImage(file);
			if (!res.success) {
				alert(res.message ?? "アップロードに失敗しました");
				return;
			}

			// 成功したら配列に追加
			setImages((prev) => [
				...prev,
				{
					url: res.data.imageUrl,
					caption: "",
					order: prev.length,
				},
			]);
		});
	};

	const handleRemoveImage = (index: number) => {
		setImages((prev) =>
			prev
				.filter((_, i) => i !== index)
				.map((img, idx) => ({ ...img, order: idx })),
		);
	};

	const handleMoveImage = (index: number, dir: "up" | "down") => {
		if (hideReorder) return;
		if (
			(dir === "up" && index === 0) ||
			(dir === "down" && index === images.length - 1)
		)
			return;

		setImages((prev) => {
			const next = [...prev];
			const [moved] = next.splice(index, 1);
			next.splice(dir === "up" ? index - 1 : index + 1, 0, moved);
			return next.map((img, idx) => ({ ...img, order: idx }));
		});
	};

	const handleCaptionChange = (index: number, value: string) => {
		setImages((prev) =>
			prev.map((img, i) => (i === index ? { ...img, caption: value } : img)),
		);
	};

	/* ---------- JSX ---------- */
	return (
		<div className="space-y-4">
			{/* 一覧表示 */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{images.map((img, idx) => (
					<div
						key={img.id ?? idx}
						className="relative flex flex-col border border-border rounded-md overflow-hidden"
					>
						<div className="relative h-40 bg-muted">
							<Image
								src={img.url}
								alt={img.caption || `Project image ${idx + 1}`}
								fill
								sizes="(max-width: 640px) 100vw, 50vw"
								className="object-contain"
							/>
							{isPending && img.url.startsWith("blob:") && (
								<div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm">
									Uploading…
								</div>
							)}
						</div>

						{showCaption && (
							<div className="p-3 flex-1">
								<Textarea
									value={img.caption}
									placeholder="Caption"
									onChange={(e) => handleCaptionChange(idx, e.target.value)}
									className="min-h-14 text-sm"
								/>
							</div>
						)}

						<div className="p-2 bg-muted flex justify-between items-center">
							{/* 並べ替えボタン */}
							{!hideReorder && (
								<div className="flex gap-1">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 w-8 p-0"
										onClick={() => handleMoveImage(idx, "up")}
										disabled={idx === 0}
										aria-label="Move image up"
									>
										▲
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 w-8 p-0"
										onClick={() => handleMoveImage(idx, "down")}
										disabled={idx === images.length - 1}
										aria-label="Move image down"
									>
										▼
									</Button>
								</div>
							)}

							{/* 削除ボタン */}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 text-destructive"
								onClick={() => handleRemoveImage(idx)}
								aria-label="Remove image"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>
				))}
			</div>

			{/* アップロードボタン */}
			{images.length < maxImages && (
				<>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleSelectFile}
					/>
					<Button
						type="button"
						variant="outline"
						className="w-full text-muted-foreground hover:text-foreground"
						onClick={() => fileInputRef.current?.click()}
						disabled={isPending}
					>
						<Plus className="w-4 h-4 mr-2" />
						{isPending ? "Uploading…" : "Add image"}
					</Button>
				</>
			)}
		</div>
	);
}
