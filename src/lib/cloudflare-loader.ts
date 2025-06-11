import type { ImageLoaderProps } from "next/image";

const host = process.env.NEXT_PUBLIC_CF_IMAGE_HOST ?? "images.evame.tech";

function normalizePath(src: string): string {
	try {
		const { pathname } = new URL(src);
		return pathname.startsWith("/") ? pathname : `/${pathname}`;
	} catch {
		return src.startsWith("/") ? src : `/${src}`;
	}
}

export default function cloudflareLoader({
	src,
	width,
	quality,
}: ImageLoaderProps) {
	/* ① ローカル（MinIO 等）の URL はそのまま返す */
	if (src.startsWith("http://localhost")) return src;

	/* ② 以降は今まで通り */
	const path = normalizePath(src);
	const q = quality ?? 75;

	if (path.startsWith("/uploads/")) {
		return `https://${host}/cdn-cgi/image/width=${width},quality=${q},format=auto${path}`;
	}

	return path; // SVG や /icons/... など
}
