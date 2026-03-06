import { ImageResponse } from "next/og";

export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

export default async function Image() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background:
					"radial-gradient(circle at top, rgb(59, 130, 246), rgb(15, 23, 42) 60%)",
				color: "white",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "20px",
				}}
			>
				<p
					style={{
						fontSize: 84,
						fontWeight: 700,
						letterSpacing: "0.08em",
						margin: 0,
						textTransform: "uppercase",
					}}
				>
					Evame
				</p>
				<p
					style={{
						fontSize: 32,
						margin: 0,
						opacity: 0.86,
					}}
				>
					Internet Without Language Barriers
				</p>
			</div>
		</div>,
		{
			...size,
		},
	);
}
