import { createTranslator } from "use-intl/core";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { messages } from "@/i18n/messages";
import { loadReaderHeader } from "./_service/load-reader-header";

export async function getReaderHeaderData(request: Request) {
	const locale = new URL(request.url).searchParams.get("locale");
	if (
		!locale ||
		!supportedLocaleOptions.some((option) => option.code === locale)
	)
		return new Response(null, {
			status: 400,
			headers: PRIVATE_RESPONSE_HEADERS,
		});
	const { data, cookies } = await loadReaderHeader(request.headers);
	const headers = new Headers(PRIVATE_RESPONSE_HEADERS);
	for (const cookie of cookies) headers.append("Set-Cookie", cookie);
	const t = createTranslator({
		locale,
		messages: messages[locale as keyof typeof messages] ?? messages.en,
		namespace: "Header",
	});
	return Response.json(
		{
			...data,
			unreadDescription:
				data.unreadCount > 0
					? t("unreadNotifications", { count: data.unreadCount })
					: "",
		},
		{ headers },
	);
}
