import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";

const OG_CACHE_CONTROL =
	"public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
const OG_NOT_FOUND_CACHE_CONTROL =
	"public, max-age=0, s-maxage=60, stale-while-revalidate=600";

export async function GET(req: Request): Promise<Response> {
	const { searchParams } = new URL(req.url);
	const interFontSemiBold = await readFile(
		join(process.cwd(), "public", "inter-semi-bold.ttf"),
	);
	const bizUDPGothicFontBold = await readFile(
		join(process.cwd(), "public", "BIZUDPGothic-Bold.ttf"),
	);
	const locale: string = searchParams.get("locale") || "en";
	const slug: string = searchParams.get("slug") || "";

	const [logoData, pageDetail] = await Promise.all([
		readFile(join(process.cwd(), "public", "logo.png")),
		fetchPageDetail(slug, locale),
	]);

	const logoSrc = `data:image/png;base64,${Buffer.from(logoData).toString("base64")}`;

	if (!pageDetail) {
		const res = new ImageResponse(
			<div tw="flex items-center justify-center w-full h-full bg-slate-100">
				<p tw="text-6xl">Page Not Found</p>
			</div>,
			{
				width: 1200,
				height: 630,
			},
		);
		res.headers.set("Cache-Control", OG_NOT_FOUND_CACHE_CONTROL);
		return res;
	}
	const { title } = pageDetail;

	const res = new ImageResponse(
		<div
			style={{
				fontFamily: "Inter,BIZ UDPGothic",
			}}
			tw="flex items-center justify-center bg-black w-full h-full p-6"
		>
			<div tw="bg-slate-100 flex flex-col items-center justify-start w-[95%] h-[95%] rounded-xl p-10">
				{/* ヘッダー部分 */}
				<div tw="flex items-center justify-between w-full ">
					{/* 左側のアバターと名前 */}
					<div tw="flex items-center">
						{/* biome-ignore lint/performance/noImgElement: <> */}
						<img
							alt={pageDetail?.userName}
							src={pageDetail?.userImage}
							tw="w-24 h-24 rounded-full mr-4"
						/>
						<p tw="text-6xl ">{pageDetail?.userName}</p>
					</div>
					{/* 右端にロゴ */}
					{/* biome-ignore lint/performance/noImgElement: <> */}
					<img
						alt="logo"
						src={logoSrc}
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
	res.headers.set("Cache-Control", OG_CACHE_CONTROL);
	return res;
}
