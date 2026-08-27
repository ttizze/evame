type MagicLinkEmail = {
	apiKey: string;
	from: string;
	email: string;
	link: string;
	fetchImpl?: typeof fetch;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export async function sendMagicLinkEmail(input: MagicLinkEmail): Promise<void> {
	if (!input.apiKey || !input.from) {
		throw new Error("メール送信が設定されていません");
	}

	const response = await (input.fetchImpl ?? fetch)(
		"https://api.resend.com/emails",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${input.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: input.from,
				to: [input.email],
				subject: "Your Digital Buddhism sign-in link",
				html: `<p>Use this link to sign in to Digital Buddhism:</p><p><a href="${escapeHtml(input.link)}">Sign in</a></p><p>If you did not request this email, you can ignore it.</p>`,
			}),
		},
	);

	if (!response.ok) {
		throw new Error("メール送信に失敗しました");
	}
}
