import { useEffect, useState } from "react";

export type PreviewData = {
	title: string;
	favicon: string;
	image: string;
	description: string;
	url: string;
	domain: string;
};
interface LinkPreviewProps {
	url: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
	const [previewData, setPreviewData] = useState<PreviewData | null>(null);

	useEffect(() => {
		const fetchPreviewData = async () => {
			try {
				const response = await fetch(
					`/resources/link-preview?url=${encodeURIComponent(url)}`,
				);
				if (response.ok) {
					const data = await response.json();
					setPreviewData(data);
				}
			} catch (error) {
				console.error("Error fetching link preview:", error);
			}
		};

		fetchPreviewData();
	}, [url]);

	if (!previewData) {
		return null;
	}

	return (
		<span className="w-full max-w-md shadow-md rounded-md border inline-block p-4">
			<span className="grid">
				<span className="grid-cols-1">
					<span className="text-lg font-bold">{previewData.title}</span>
					<span className="text-md">{previewData.description}</span>
					<span className="flex items-center">
						<img
							src={previewData.favicon}
							alt="favicon"
							className="w-4 h-4 mr-2"
						/>
						<span className="text-sm text-muted-foreground">
							{previewData.domain}
						</span>
					</span>
				</span>
				<img
					src={previewData.image}
					alt={previewData.title}
					className="grid-cols-2"
				/>
			</span>
		</span>
	);
}
