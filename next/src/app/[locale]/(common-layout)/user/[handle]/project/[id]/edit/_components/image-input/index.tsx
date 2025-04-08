"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface ProjectImage {
	id?: string;
	url: string;
	caption: string;
	order: number;
	file?: File; // For new uploads
}

interface ProjectImageInputProps {
	initialImages: ProjectImage[];
	onChange: (images: ProjectImage[]) => void;
}

export function ProjectImageInput({
	initialImages,
	onChange,
}: ProjectImageInputProps) {
	const [images, setImages] = useState<ProjectImage[]>(
		initialImages.sort((a, b) => a.order - b.order),
	);
	const [isAdding, setIsAdding] = useState(false);
	const [newImage, setNewImage] = useState<ProjectImage>({
		url: "",
		caption: "",
		order: 0,
		file: undefined,
	});
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		// Update the parent component whenever images change
		onChange(images);
	}, [images, onChange]);

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file is an image
		if (!file.type.startsWith("image/")) {
			alert("Please select an image file");
			return;
		}

		// Create a temporary preview URL for display only
		const objectUrl = URL.createObjectURL(file);
		setPreviewUrl(objectUrl);

		// Generate a temporary filename-based URL for identification
		// This is not a real URL, just a way to identify the file later
		const tempUrl = `temp://upload/${Date.now()}-${file.name}`;

		// Update the new image state
		setNewImage({
			...newImage,
			file,
			url: tempUrl, // Use the temp URL as identifier
		});

		// Cleanup preview URL when the component unmounts
		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	};

	const handleAddImage = () => {
		if (!newImage.file) return;

		// Add the new image to the array with the correct order
		const updatedImages = [
			...images,
			{
				...newImage,
				order: images.length,
			},
		];

		setImages(updatedImages);

		// Reset the form
		setNewImage({
			url: "",
			caption: "",
			order: 0,
			file: undefined,
		});
		setPreviewUrl(null);
		setIsAdding(false);
	};

	const handleRemoveImage = (index: number) => {
		// Remove the image at the specified index
		const updatedImages = [...images];
		updatedImages.splice(index, 1);

		// Update order values for remaining images
		const reorderedImages = updatedImages.map((img, idx) => ({
			...img,
			order: idx,
		}));

		setImages(reorderedImages);
	};

	const handleMoveImage = (index: number, direction: "up" | "down") => {
		if (
			(direction === "up" && index === 0) ||
			(direction === "down" && index === images.length - 1)
		) {
			return;
		}

		const newIndex = direction === "up" ? index - 1 : index + 1;
		const updatedImages = [...images];
		const [movedImage] = updatedImages.splice(index, 1);
		updatedImages.splice(newIndex, 0, movedImage);

		// Update order values
		const reorderedImages = updatedImages.map((img, idx) => ({
			...img,
			order: idx,
		}));

		setImages(reorderedImages);
	};

	// Function to get display URL for an image (either real URL or preview)
	const getDisplayUrl = (image: ProjectImage, index: number) => {
		// If it's a new image with a temporary URL, use the preview URL
		if (image.url.startsWith("temp://upload/") && image.file) {
			// Generate a preview URL on demand if we don't have one
			return URL.createObjectURL(image.file);
		}
		// Otherwise use the stored URL
		return image.url;
	};

	return (
		<div className="space-y-4">
			{/* Display existing images */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{images.map((image, index) => (
					<div
						key={`image-${image.id || index}`}
						className="relative flex flex-col border border-border rounded-md overflow-hidden"
					>
						{/* Image */}
						<div className="relative h-40 bg-muted">
							<Image
								src={getDisplayUrl(image, index)}
								alt={image.caption || `Project image ${index + 1}`}
								fill
								sizes="(max-width: 640px) 100vw, 50vw"
								className="object-contain"
							/>
						</div>

						{/* Caption */}
						<div className="p-3 flex-1">
							<p className="text-sm font-medium truncate">
								{image.caption || `Image ${index + 1}`}
							</p>
							{image.file && (
								<p className="text-xs text-muted-foreground truncate">
									{image.file.name}
								</p>
							)}
						</div>

						{/* Controls */}
						<div className="p-2 bg-muted flex justify-between items-center">
							<div className="flex gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-8 w-8 p-0"
									onClick={() => handleMoveImage(index, "up")}
									disabled={index === 0}
									aria-label="Move image up"
								>
									<svg
										width="15"
										height="15"
										viewBox="0 0 15 15"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4"
										aria-hidden="true"
									>
										<path
											d="M7.5 3L7.5 11M7.5 3L4 6.5M7.5 3L11 6.5"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-8 w-8 p-0"
									onClick={() => handleMoveImage(index, "down")}
									disabled={index === images.length - 1}
									aria-label="Move image down"
								>
									<svg
										width="15"
										height="15"
										viewBox="0 0 15 15"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4"
										aria-hidden="true"
									>
										<path
											d="M7.5 12L7.5 4M7.5 12L4 8.5M7.5 12L11 8.5"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</Button>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 text-destructive"
								onClick={() => handleRemoveImage(index)}
								aria-label={`Remove ${image.caption || `image ${index + 1}`}`}
							>
								<X className="h-4 w-4" aria-hidden="true" />
							</Button>
						</div>
					</div>
				))}
			</div>

			{/* Add new image form */}
			{isAdding ? (
				<div className="border border-border rounded-md p-4 space-y-4">
					<div className="flex flex-col gap-2">
						<label htmlFor="image-upload" className="text-sm font-medium">
							Image
							<span className="text-destructive"> *</span>
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
			) : (
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
