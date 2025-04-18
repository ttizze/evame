import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchPageContext } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_lib/fetch-page-context";
import { ImageResponse } from "next/og";

export const revalidate = 3600;
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
	const showTranslation: boolean =
		searchParams.get("showTranslation") === "true";
	const showOriginal: boolean = searchParams.get("showOriginal") === "true";
	const [logoData, pageContext] = await Promise.all([
		readFile(join(process.cwd(), "public", "logo.png")),
		fetchPageContext(slug, locale, showOriginal, showTranslation),
	]);

	const logoSrc = Uint8Array.from(logoData).buffer;

	if (!pageContext) {
		return new ImageResponse(
			<div tw="flex items-center justify-center w-full h-full bg-slate-100">
				<p tw="text-6xl">Page Not Found</p>
			</div>,
			{
				width: 1200,
				height: 630,
			},
		);
	}
	const { pageDetail, title } = pageContext;
	const pageOwner = pageDetail.user;

	return new ImageResponse(
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
						<img
							tw="w-24 h-24 rounded-full mr-4"
							src={pageOwner?.image}
							alt={pageOwner?.name}
						/>
						<p tw="text-6xl ">{pageOwner?.name}</p>
					</div>
					{/* 右端にロゴ */}
					<img
						//@ts-expect-error srcの型がおかしいが､これはバグではない
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
}
