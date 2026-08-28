"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { FcGoogle } from "react-icons/fc";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { Button } from "@/components/ui/button";

export function GoogleForm({ redirectTo }: { redirectTo: string }) {
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const handleGoogleSignIn = () =>
		startTransition(async () => {
			authClient.signIn
				.social({
					provider: "google",
					callbackURL: redirectTo,
					disableRedirect: false,
				})
				.catch((e) => {
					setError("Failed to sign in with Google. Please try again.");
					throw e;
				});
		});

	return (
		<div className="w-full space-y-2">
			<Button
				className="w-full rounded-full h-12 text-md"
				disabled={isPending}
				onClick={handleGoogleSignIn}
				variant="default"
			>
				{isPending ? (
					<Loader2 className="mr-2 h-5 w-5 animate-spin" />
				) : (
					<FcGoogle className="mr-2 h-6 w-6" />
				)}
				{isPending ? "Signing in..." : "Google Login"}
			</Button>
			{error && <p className="text-sm text-destructive text-center">{error}</p>}
		</div>
	);
}
