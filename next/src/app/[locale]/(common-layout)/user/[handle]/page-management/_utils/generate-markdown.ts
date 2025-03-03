export function generateMarkdownFromDirectory(
	folderPath: string,
	files: { name: string; slug: string }[],
): string {
	let markdown = `# ${folderPath}\n\n`;

	for (const file of files) {
		markdown += `- [${file.name}](/${file.slug})\n`;
	}

	return markdown;
}
