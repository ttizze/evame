import type { ImageLoaderProps } from "next/image";

const host = process.env.NEXT_PUBLIC_CF_IMAGE_HOST ?? "images.evame.tech";

// CF に流すべきファイル拡張子（ビットマップ系だけ）
const CF_ELIGIBLE_EXT = /\.(jpe?g|png|webp|avif)$/i;

function normalizePath(src: string): string {
	try {
		// フル URL なら pathname だけ取り出す
		const { pathname } = new URL(src);
		return pathname.startsWith("/") ? pathname : `/${pathname}`;
	} catch {
		// 相対パス
		return src.startsWith("/") ? src : `/${src}`;
	}
}

export default function cloudflareLoader({
	src,
	width,
	quality,
}: ImageLoaderProps) {
	const path = normalizePath(src);
	const q = quality ?? 75;

	// ① /uploads/ かつ ビットマップ系 → Cloudflare Images
	if (path.startsWith("/uploads/") && CF_ELIGIBLE_EXT.test(path)) {
		return `https://${host}/cdn-cgi/image/width=${width},quality=${q},format=auto${path}`;
	}

	// ② それ以外（SVG やローカル静的ファイル）→ 素通し
	//    Next.js が basePath を自動で付けるので `/x.svg` のままで OK
	return path;
}
