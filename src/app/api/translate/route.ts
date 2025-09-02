import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";
import { translate } from "@/app/api/translate/_lib/translate.server";
import type { TranslateJobParams } from "@/app/api/translate/types";
import { prisma } from "@/lib/prisma";
import { revalidateAllLocales } from "@/lib/revalidate-utils";

async function handler(req: Request) {
	try {
		const params = (await req.json()) as TranslateJobParams;

		await translate(params);

		const page = await prisma.page.findFirst({
			where: { id: params.pageId },
			select: { slug: true, user: { select: { handle: true } } },
		});
		if (page) {
			revalidateAllLocales(`/user/${page.user.handle}/page/${page.slug}`);
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("/api/translate error:", error);
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}

const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
const next = process.env.QSTASH_NEXT_SIGNING_KEY;

export const POST =
	current && next
		? verifySignatureAppRouter(handler, {
				currentSigningKey: current,
				nextSigningKey: next,
			})
		: handler;
