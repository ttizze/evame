"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

/* ---------- 型定義 ---------- */
export interface ProjectImage {
	id?: number;
	url: string;
	caption: string;
	order: number;
	file?: File;
}

interface ProjectImageInputProps {
	initialImages: ProjectImage[];
	onChange: (images: ProjectImage[]) => void;
	maxImages?: number; // 追加: 最大枚数 (デフォルト = 10)
	hideReorder?: boolean; // 追加: 並び替え UI を隠すか
	showCaption?: boolean; // 追加: キャプションを表示するか
}

/* ---------- コンポーネント ---------- */
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
	const [isAdding, setIsAdding] = useState(false);
	const [newImage, setNewImage] = useState<ProjectImage>({
		url: "",
		caption: "",
		order: 0,
		file: undefined,
	});
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	/* --- 親への通知 --- */
	useEffect(() => onChange(images), [images, onChange]);

	/* --- プレビュー URL 解放 --- */
	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	/* ---------- ハンドラ ---------- */
	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			alert("Please select an image file");
			return;
		}

		const objectUrl = URL.createObjectURL(file);
		setPreviewUrl(objectUrl);

		// temp URL (ファイル識別用)
		const tempUrl = `temp://upload/${Date.now()}-${file.name}`;
		setNewImage({ ...newImage, file, url: tempUrl });
	};

	const handleAddImage = () => {
		if (!newImage.file) return;
		if (images.length >= maxImages) return; // ★ 枚数上限

		setImages([...images, { ...newImage, order: images.length }]);

		// reset
		setNewImage({ url: "", caption: "", order: 0, file: undefined });
		setPreviewUrl(null);
		setIsAdding(false);
	};

	const handleRemoveImage = (index: number) => {
		const updated = images
			.filter((_, i) => i !== index)
			.map((img, idx) => ({ ...img, order: idx }));
		setImages(updated);
	};

	const handleMoveImage = (index: number, dir: "up" | "down") => {
		if (hideReorder) return;
		if (
			(dir === "up" && index === 0) ||
			(dir === "down" && index === images.length - 1)
		)
			return;

		const next = [...images];
		const [moved] = next.splice(index, 1);
		next.splice(dir === "up" ? index - 1 : index + 1, 0, moved);
		setImages(next.map((img, idx) => ({ ...img, order: idx })));
	};

	const displayUrl = (img: ProjectImage) =>
		img.url.startsWith("temp://upload/") && img.file
			? URL.createObjectURL(img.file)
			: img.url;

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
								src={displayUrl(img)}
								alt={img.caption || `Project image ${idx + 1}`}
								fill
								sizes="(max-width: 640px) 100vw, 50vw"
								className="object-contain"
							/>
						</div>

						{showCaption && (
							<div className="p-3 flex-1">
								<p className="text-sm font-medium truncate">
									{img.caption || `Image ${idx + 1}`}
								</p>
								{img.file && (
									<p className="text-xs text-muted-foreground truncate">
										{img.file.name}
									</p>
								)}
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

			{/* 追加フォーム */}
			{isAdding ? (
				<div className="border border-border rounded-md p-4 space-y-4">
					<div className="flex flex-col gap-2">
						<label htmlFor="image-upload" className="text-sm font-medium">
							Image<span className="text-destructive"> *</span>
						</label>
						<Input
							id="image-upload"
							type="file"
							accept="image/*"
							onChange={handleImageChange}
							className="flex h-10 w-full"
						/>
					</div>

					{previewUrl && (
						<div className="relative h-40 bg-muted rounded-md overflow-hidden">
							<Image
								src={previewUrl}
								alt="Image preview"
								fill
								sizes="100vw"
								className="object-contain"
							/>
						</div>
					)}
					{showCaption && (
						<div className="flex flex-col gap-2">
							<label htmlFor="image-caption" className="text-sm font-medium">
								Caption
							</label>
							<Textarea
								id="image-caption"
								placeholder="Describe this image..."
								value={newImage.caption}
								onChange={(e) =>
									setNewImage({ ...newImage, caption: e.target.value })
								}
								className="min-h-20"
							/>
						</div>
					)}
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setIsAdding(false);
								setNewImage({
									url: "",
									caption: "",
									order: 0,
									file: undefined,
								});
								setPreviewUrl(null);
							}}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!newImage.file}
							onClick={handleAddImage}
						>
							Add Image
						</Button>
					</div>
				</div>
			) : images.length >= maxImages ? null : (
				<Button
					type="button"
					variant="outline"
					className="w-full text-muted-foreground hover:text-foreground"
					onClick={() => setIsAdding(true)}
				>
					<Plus className="w-4 h-4 mr-2" /> Add project image
				</Button>
			)}
		</div>
	);
}
