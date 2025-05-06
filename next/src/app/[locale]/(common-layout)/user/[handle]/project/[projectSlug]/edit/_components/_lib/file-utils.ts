// components/project-form/utils.ts
export const fileNameFromUrl = (url: string): string =>
	url.split("/").pop() ?? "";

export const stripFileField = <T extends { file?: File }>(
	item: T,
): Omit<T, "file"> => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { file, ...rest } = item;
	return rest;
};
