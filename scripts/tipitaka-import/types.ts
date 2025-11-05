export interface DirectoryNode {
	segment: string;
	title: string;
	order: number;
	children: Map<string, DirectoryNode>;
	pageId?: number;
}

export interface ImportEntry {
	fileKey: string;
	filePath: string;
	level: string;
	resolvedDirSegments: string[];
	dirSegments: string[];
	orderHint: number;
	mulaFileKey: string | null;
	atthakathaIndex?: number;
}
