export interface DirectoryNode {
	segment: string;
	title: string;
	order: number;
	children: Map<string, DirectoryNode>;
	pageId?: number;
}

export interface ImportEntry {
	fileKey: string;
	level: string;
	dirSegments: string[];
	mulaFileKey: string | null;
}
