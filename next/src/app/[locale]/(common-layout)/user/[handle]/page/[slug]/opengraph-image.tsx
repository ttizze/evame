import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPageData } from "./page";

export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

type Params = Promise<{ locale: string; handle: string; slug: string }>;

async function loadGoogleFont(font: string, text: string) {
	const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
	const css = await (await fetch(url)).text();
	const resource = css.match(
		/src: url\((.+)\) format\('(opentype|truetype)'\)/,
	);

	if (resource) {
		const response = await fetch(resource[1]);
		if (response.status === 200) {
			return await response.arrayBuffer();
		}
	}

	throw new Error("failed to load font data");
}
export default async function Image({ params }: { params: Params }) {
	// params を展開
	const { locale, slug } = await params;
	const logoData = await readFile(join(process.cwd(), "public", "logo.png"));
	const logoSrc = Uint8Array.from(logoData).buffer;
	const faviconData = await readFile(join(process.cwd(), "public", "bgogp.png"));
	const faviconSrc = Uint8Array.from(faviconData).buffer;
	const faviconSrcUrl = `data:image/png;base64,${Buffer.from(faviconSrc).toString("base64")}`;

	// ページデータを取得
	const data = await getPageData(slug, locale);

	const pageOwner = data?.pageWithTranslations.user;
	const title = data
		? data.sourceTitleWithBestTranslationTitle
		: "Page Not Found";

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				padding: "20px",
				backgroundSize: "100% 100%",
				fontFamily: "Inter,BIZ UDPGothic",
				backgroundImage: `url(${faviconSrcUrl})`,
			}}
			tw="flex items-center justify-center"
		>
			<div
				tw="bg-slate-100 flex flex-col items-center justify-start shadow-xl"
				style={{
					width: "95%",
					height: "95%",
					borderRadius: "15px",
					padding: "40px",
				}}
			>
				{/* ヘッダー部分 */}
				<div tw="flex items-center justify-between w-full ">
					{/* 左側のアバターと名前 */}
					<div tw="flex items-center">
						<img
							tw="w-24 h-24 rounded-full mr-4"
							src={pageOwner?.image}
							alt={pageOwner?.name}
						/>
						<p tw="text-6xl ">{pageOwner?.name}</p>
					</div>
					{/* 右端にロゴ */}
					<img
						//@ts-ignore
						src={logoSrc}
						alt="logo"
						style={{
							width: "200px",
						}}
					/>
				</div>
				{/* タイトル */}
				<p tw="text-6xl  mt-14">{title}</p>
			</div>
		</div>,
		{
			...size,
			fonts: [
				{
					name: "Inter",
					data: await loadGoogleFont("Inter", title),
					style: "normal",
					weight: 900,
				},
				{
					name: "BIZ UDPGothic",
					data: await loadGoogleFont("BIZ UDPGothic", title),
					style: "normal",
					weight: 900,
				},
			],
		},
	);
}
