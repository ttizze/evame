"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportMarkdownButtonProps {
	markdown: string;
	title: string;
	slug: string;
}

function toSafeFileName(value: string) {
	const trimmed = value.trim();
	const safe = trimmed
		.replace(/[\\/:*?"<>|]/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
	return safe.length > 0 ? safe : "page";
}

export function ExportMarkdownButton({
	markdown,
	title,
	slug,
}: ExportMarkdownButtonProps) {
	const hasContent = markdown.trim().length > 0;
	const baseName = toSafeFileName(title || slug);
	const fileName = `${baseName}.md`;

	const handleClick = () => {
		if (!hasContent) return;
		const blob = new Blob([markdown], {
			type: "text/markdown;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	};

	return (
		<Button
			aria-label="Markdownを出力"
			disabled={!hasContent}
			onClick={handleClick}
			size="sm"
			variant="outline"
		>
			<DownloadIcon className="mr-2 h-4 w-4" />
			Markdownを出力
		</Button>
	);
}
