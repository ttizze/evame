import { env } from "cloudflare:workers";

export async function transformImage(
	file: File,
	width: number,
	quality: number,
): Promise<ArrayBuffer> {
	// WorkersとDOMのStream型は異なるが、実体は同じWeb Stream API。
	const image = await env.IMAGES.input(
		file.stream() as unknown as Parameters<typeof env.IMAGES.input>[0],
	)
		.transform({ width, fit: "scale-down" })
		.output({ format: "image/jpeg", quality });
	return image.response().arrayBuffer();
}
