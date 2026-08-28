import { ImageResponse } from "@vercel/og";
import { useStorage as getNitroStorage } from "nitro/storage";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";

const OG_CACHE_CONTROL =
	"public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
const OG_NOT_FOUND_CACHE_CONTROL =
	"public, max-age=0, s-maxage=60, stale-while-revalidate=600";

const ogAssets = getNitroStorage("assets/og");

async function readOgAsset(assetName: string): Promise<ArrayBuffer> {
	const asset = await ogAssets.getItemRaw<Uint8Array>(assetName);
	if (asset == null) {
		throw new Error(`Missing OG server asset: ${assetName}`);
	}
	if (asset instanceof ArrayBuffer) {
		return asset;
	}
	if (ArrayBuffer.isView(asset)) {
		return new Uint8Array(
			asset.buffer,
			asset.byteOffset,
			asset.byteLength,
		).slice().buffer;
	}
	throw new TypeError(`Invalid OG server asset: ${assetName}`);
}

export async function getOgImage(request: Request): Promise<Response> {
	const { searchParams } = new URL(request.url);
	const locale = searchParams.get("locale") || "en";
	const slug = searchParams.get("slug") || "";
	const pageDetail = await fetchPageDetail(slug, locale);

	if (!pageDetail) {
		const response = new ImageResponse(
			<div tw="flex items-center justify-center w-full h-full bg-slate-100">
				<p tw="text-6xl">Page Not Found</p>
			</div>,
			{
				width: 1200,
				height: 630,
			},
		);
		response.headers.set("Cache-Control", OG_NOT_FOUND_CACHE_CONTROL);
		return response;
	}

	const [interFontSemiBold, bizUDPGothicFontBold, logoData] = await Promise.all(
		[
			readOgAsset("inter-semi-bold.ttf"),
			readOgAsset("BIZUDPGothic-Bold.ttf"),
			readOgAsset("logo.png"),
		],
	);
	const logoSrc = `data:image/png;base64,${Buffer.from(logoData).toString("base64")}`;
	const response = new ImageResponse(
		<div
			style={{
				fontFamily: "Inter,BIZ UDPGothic",
			}}
			tw="flex items-center justify-center bg-black w-full h-full p-6"
		>
			<div tw="bg-slate-100 flex flex-col items-center justify-start w-[95%] h-[95%] rounded-xl p-10">
				<div tw="flex items-center justify-between w-full ">
					<div tw="flex items-center">
						<img
							alt={pageDetail.userName}
							src={pageDetail.userImage}
							tw="w-24 h-24 rounded-full mr-4"
						/>
						<p tw="text-6xl ">{pageDetail.userName}</p>
					</div>
					<img
						alt="logo"
						src={logoSrc}
						style={{
							width: "200px",
						}}
					/>
				</div>
				<p tw="text-6xl  mt-14">{pageDetail.title}</p>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: "Inter",
					data: interFontSemiBold,
					style: "normal",
					weight: 900,
				},
				{
					name: "BIZ UDPGothic",
					data: bizUDPGothicFontBold,
					style: "normal",
					weight: 900,
				},
			],
		},
	);
	response.headers.set("Cache-Control", OG_CACHE_CONTROL);
	return response;
}
