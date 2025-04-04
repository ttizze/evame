"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ProjectLink {
	id?: string;
	url: string;
	description: string;
}

interface ProjectLinkInputProps {
	initialLinks: ProjectLink[];
	onChange: (links: ProjectLink[]) => void;
}

export function ProjectLinkInput({
	initialLinks,
	onChange,
}: ProjectLinkInputProps) {
	const [links, setLinks] = useState<ProjectLink[]>(initialLinks);
	const [newLink, setNewLink] = useState<ProjectLink>({
		url: "",
		description: "",
	});
	const [isAdding, setIsAdding] = useState(false);

	useEffect(() => {
		onChange(links);
	}, [links, onChange]);

	const handleAddLink = () => {
		if (newLink.url && isValidUrl(newLink.url)) {
			setLinks([...links, newLink]);
			setNewLink({ url: "", description: "" });
			setIsAdding(false);
		}
	};

	const handleRemoveLink = (index: number) => {
		const updatedLinks = [...links];
		updatedLinks.splice(index, 1);
		setLinks(updatedLinks);
	};

	const isValidUrl = (url: string) => {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	};

	return (
		<div className="space-y-3">
			{/* Display existing links */}
			<div className="flex flex-col gap-2">
				{links.map((link, index) => (
					<div
						key={`link-${link.id || index}`}
						className="flex items-center gap-2 p-2 bg-muted border border-border rounded-md"
					>
						<button
							type="button"
							onClick={() => handleRemoveLink(index)}
							className="text-muted-foreground hover:text-destructive"
						>
							<X className="w-4 h-4" />
						</button>
						<div className="flex-1 flex flex-col">
							<span className="text-sm font-medium">
								{link.description || "Link"}
							</span>
							<div className="flex items-center gap-1 text-sm text-muted-foreground">
								<ExternalLink className="w-3 h-3" />
								<span className="truncate">{link.url}</span>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Add new link form */}
			{isAdding ? (
				<div className="flex flex-col gap-2 p-3 border border-border rounded-md">
					<Input
						placeholder="Description (e.g. Repository, Demo, Documentation)"
						value={newLink.description}
						onChange={(e) =>
							setNewLink({ ...newLink, description: e.target.value })
						}
						className="w-full mb-2"
					/>
					<div className="flex items-center gap-2">
						<Input
							placeholder="https://..."
							value={newLink.url}
							onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
							className="flex-1"
						/>
						<Button
							type="button"
							size="sm"
							onClick={handleAddLink}
							disabled={!newLink.url || !isValidUrl(newLink.url)}
						>
							Add
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								setIsAdding(false);
								setNewLink({ url: "", description: "" });
							}}
						>
							Cancel
						</Button>
					</div>
					{newLink.url && !isValidUrl(newLink.url) && (
						<p className="text-xs text-destructive mt-1">
							Please enter a valid URL
						</p>
					)}
				</div>
			) : (
				<Button
					type="button"
					variant="outline"
					className="w-full text-muted-foreground hover:text-foreground"
					onClick={() => setIsAdding(true)}
				>
					<Plus className="w-4 h-4 mr-2" /> Add project link
				</Button>
			)}
		</div>
	);
}
