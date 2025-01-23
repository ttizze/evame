import { MAX_FILE_SIZE, UPLOAD_MESSAGES } from "../constants";

export async function uploadImage(file: File): Promise<string | undefined> {
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(UPLOAD_MESSAGES.FILE_TOO_LARGE);
	}
	const formData = new FormData();
	formData.append("file", file);
	try {
		const response = await fetch("/resources/upload-r2", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			throw new Error(UPLOAD_MESSAGES.UPLOAD_FAILED);
		}

		const data = await response.json();
		return data.url;
	} catch (error) {
		window.alert(UPLOAD_MESSAGES.UPLOAD_ERROR);
	}
}
