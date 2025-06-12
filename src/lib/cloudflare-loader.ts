import type { ImageLoaderProps } from "next/image";

const host = process.env.NEXT_PUBLIC_CF_IMAGE_HOST ?? "images.evame.tech";

function toSafePath(src: string): string {
	try {
		const { pathname } = new URL(src);
		return pathname.startsWith("/") ? pathname : `/${pathname}`;
	} catch {
		return src.startsWith("/") ? src : `/${src}`;
	}
}
function appendParams(url: string, width: number, q: number) {
	const sep = url.includes("?") ? "&" : "?";
	return `${url}${sep}w=${width}&q=${q}`;
}
export default function cloudflareLoader({
	src,
	width,
	quality,
}: ImageLoaderProps) {
	/* ① ローカル（MinIO 等）の URL はそのまま返す */
	const q = quality ?? 75;
	if (src.startsWith("http://localhost")) {
		return appendParams(src, width, q);
	}

	const isInternal = src.includes("evame") || src.includes("eveeve");

	if (isInternal) {
		const safePath = toSafePath(src);
		return `https://${host}/cdn-cgi/image/width=${width},quality=${q},format=auto${safePath}`;
	}

	// 3. それ以外はそのままパススルー
	return appendParams(src, width, q);
}
