export function processUploadedFolder(files: File[]): Record<string, File[]> {
	const folderStructure: Record<string, File[]> = {};

	for (const file of files) {
		const pathParts = file.name.split("/");
		const folderPath = pathParts.slice(0, -1).join("/") || "root";

		if (!folderStructure[folderPath]) {
			folderStructure[folderPath] = [];
		}
		folderStructure[folderPath].push(file);
	}

	return folderStructure;
}
