import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { authClient } from "@/auth/client";
import { normalizeRedirectPath } from "@/components/scripture/login-link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const copy = {
	ja: {
		heading: "ログイン",
		description: "メールアドレスにログインリンクを送信します。",
		email: "メールアドレス",
		sending: "送信中…",
		submit: "ログインリンクを送信",
		sent: "ログインリンクを送信しました。メールを確認してください。",
		error: "送信できませんでした。時間をおいて再度お試しください。",
		google: "Googleでログイン",
	},
	en: {
		heading: "Sign in",
		description: "Send a sign-in link to your email address.",
		email: "Email address",
		sending: "Sending…",
		submit: "Send sign-in link",
		sent: "A sign-in link has been sent. Check your email.",
		error: "The link could not be sent. Please try again later.",
		google: "Continue with Google",
	},
	es: {
		heading: "Iniciar sesión",
		description: "Envía un enlace de inicio de sesión a tu correo electrónico.",
		email: "Correo electrónico",
		sending: "Enviando…",
		submit: "Enviar enlace de inicio de sesión",
		sent: "Se ha enviado un enlace. Revisa tu correo electrónico.",
		error: "No se pudo enviar el enlace. Inténtalo de nuevo más tarde.",
		google: "Continuar con Google",
	},
	ko: {
		heading: "로그인",
		description: "이메일 주소로 로그인 링크를 보냅니다.",
		email: "이메일 주소",
		sending: "전송 중…",
		submit: "로그인 링크 보내기",
		sent: "로그인 링크를 보냈습니다. 이메일을 확인하세요.",
		error: "링크를 보낼 수 없습니다. 나중에 다시 시도하세요.",
		google: "Google로 계속하기",
	},
	zh: {
		heading: "登录",
		description: "向你的电子邮件地址发送登录链接。",
		email: "电子邮件地址",
		sending: "发送中…",
		submit: "发送登录链接",
		sent: "登录链接已发送，请查收邮件。",
		error: "无法发送链接，请稍后再试。",
		google: "使用 Google 继续",
	},
} as const;

export function getLoginCopy(locale?: string) {
	const code = locale?.toLowerCase().split("-")[0];
	return copy[code as keyof typeof copy] ?? copy.en;
}

export const Route = createFileRoute("/login")({
	validateSearch: z.object({
		locale: z.string().optional(),
		redirect: z.string().optional(),
	}),
	component: LoginPage,
});

export function LoginPage() {
	const { locale, redirect } = Route.useSearch();
	const labels = getLoginCopy(locale);
	const redirectTo = normalizeRedirectPath(redirect);
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
		"idle",
	);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus("sending");
		try {
			const result = await authClient.signIn.magicLink({
				email,
				callbackURL: redirectTo,
			});
			setStatus(result.error ? "error" : "sent");
		} catch {
			setStatus("error");
		}
	}

	async function signInWithGoogle() {
		setStatus("sending");
		try {
			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL: redirectTo,
			});
			if (result.error) setStatus("error");
		} catch {
			setStatus("error");
		}
	}

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{labels.heading}</CardTitle>
					<CardDescription>{labels.description}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<form className="space-y-4" onSubmit={submit}>
						<div className="space-y-2">
							<Label htmlFor="login-email">{labels.email}</Label>
							<Input
								autoComplete="email"
								id="login-email"
								name="email"
								onChange={(event) => setEmail(event.target.value)}
								required
								type="email"
								value={email}
							/>
						</div>
						<Button
							className="w-full"
							disabled={status === "sending"}
							type="submit"
						>
							{status === "sending" ? labels.sending : labels.submit}
						</Button>
					</form>
					<Button
						className="w-full"
						disabled={status === "sending"}
						onClick={signInWithGoogle}
						type="button"
						variant="outline"
					>
						{labels.google}
					</Button>
					<p
						aria-live="polite"
						className={
							status === "error"
								? "text-sm text-destructive"
								: "text-sm text-muted-foreground"
						}
						role={status === "error" ? "alert" : "status"}
					>
						{status === "sent" && labels.sent}
						{status === "error" && labels.error}
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
