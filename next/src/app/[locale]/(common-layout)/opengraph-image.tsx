import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

export default async function Image() {
	const logoData = await readFile(join(process.cwd(), "public", "logo.png"));
	const logoSrc = Uint8Array.from(logoData).buffer;

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				padding: "20px",
				backgroundSize: "100% 100%",
			}}
			tw="flex items-center justify-center"
		>
			{/* @ts-ignore */}
			<img src={logoSrc} alt="logo" />
		</div>,
		{
			...size,
		},
	);
}
