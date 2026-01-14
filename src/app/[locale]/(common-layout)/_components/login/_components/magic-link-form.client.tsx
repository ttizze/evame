"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { z } from "zod";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

export function MagicLinkForm() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		// ── クライアント側バリデーション ──
		const v = schema.safeParse({ email });
		if (!v.success) {
			setError(
				v.error.flatten().fieldErrors.email?.[0] ?? "Invalid email address",
			);
			return;
		}

		// ── 非同期処理を transition に載せる ──
		startTransition(() =>
			authClient.signIn
				.magicLink({
					email: v.data.email,
					callbackURL: "/",
				})
				.then(() => setSent(true))
				.catch((e) => {
					setError("Failed to send magic link. Please try again.");
					throw e;
				}),
		);
	}

	if (sent) {
		return (
			<div className="text-center space-y-3">
				<div className="flex items-center justify-center gap-2">
					<CheckCircle className="h-5 w-5 text-green-600" />
					<p className="font-medium">Email sent successfully!</p>
				</div>
				<p className="text-sm text-muted-foreground">
					Please check your inbox.
				</p>
			</div>
		);
	}

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			<div className="space-y-2">
				<Label htmlFor="email">Email</Label>
				<Input
					autoComplete="email"
					id="email"
					name="email"
					onChange={(e) => setEmail(e.target.value)}
					required
					type="email"
					value={email}
				/>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>

			<Button
				className="w-full rounded-full"
				disabled={isPending}
				type="submit"
			>
				{isPending ? (
					<Loader2 className="w-4 h-4 animate-spin" />
				) : (
					"Send Email"
				)}
			</Button>
		</form>
	);
}
