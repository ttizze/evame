import { ImageResponse } from "next/og";

// Image metadata
export const alt = "About Acme";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

// Image generation
type Params = Promise<{ locale: string; handle: string; slug: string }>;

export default async function Image({ params }: { params: Params }) {
	const { locale } = await params;
	return new ImageResponse(
		// ImageResponse JSX element
		<div
			style={{
				fontSize: 128,
				background: "white",
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{locale}
		</div>,
		// ImageResponse options
		{
			// For convenience, we can re-use the exported opengraph-image
			// size config to also set the ImageResponse's width and height.
			...size,
		},
	);
}
