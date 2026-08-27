import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { z } from "zod";

const copy = {
	ja: {
		heading: "ログイン",
		description: "メールアドレスにログインリンクを送信します。",
		email: "メールアドレス",
		sending: "送信中…",
		submit: "ログインリンクを送信",
		sent: "ログインリンクを送信しました。メールを確認してください。",
		error: "送信できませんでした。時間をおいて再度お試しください。",
	},
	en: {
		heading: "Sign in",
		description: "Send a sign-in link to your email address.",
		email: "Email address",
		sending: "Sending…",
		submit: "Send sign-in link",
		sent: "A sign-in link has been sent. Check your email.",
		error: "The link could not be sent. Please try again later.",
	},
} as const;

export function getLoginCopy(locale?: string) {
	return locale?.toLowerCase().startsWith("ja") ? copy.ja : copy.en;
}

export const Route = createFileRoute("/login")({
	validateSearch: z.object({ locale: z.string().optional() }),
	component: LoginPage,
});

export function LoginPage() {
	const { locale } = Route.useSearch();
	const labels = getLoginCopy(locale);
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
		"idle",
	);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus("sending");
		try {
			const response = await fetch("/api/auth/request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			setStatus(response.ok ? "sent" : "error");
		} catch {
			setStatus("error");
		}
	}

	return (
		<main>
			<h1>{labels.heading}</h1>
			<p>{labels.description}</p>
			<form onSubmit={submit}>
				<label htmlFor="login-email">{labels.email}</label>
				<input
					autoComplete="email"
					id="login-email"
					name="email"
					onChange={(event) => setEmail(event.target.value)}
					required
					type="email"
					value={email}
				/>
				<button disabled={status === "sending"} type="submit">
					{status === "sending" ? labels.sending : labels.submit}
				</button>
			</form>
			<p aria-live="polite">
				{status === "sent" && labels.sent}
				{status === "error" && labels.error}
			</p>
		</main>
	);
}
