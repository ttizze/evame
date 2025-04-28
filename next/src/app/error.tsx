"use client"; // Error boundaries must be Client Components

import { Button } from "@/components/ui/button";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	// エラーをログに記録
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
			<div className="flex flex-col items-center justify-center space-y-6 text-center">
				<div className="rounded-full bg-destructive/10 p-4">
					<AlertCircle className="h-12 w-12 text-destructive" />
				</div>

				<div className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
						Error
					</h1>
					<p className="text-muted-foreground">Sorry, an error occurred.</p>
					{error.digest && (
						<p className="text-sm text-muted-foreground">
							Error code:{" "}
							<code className="rounded bg-muted px-1 py-0.5">
								{error.digest}
							</code>
						</p>
					)}
				</div>

				<div className="flex gap-2">
					<Button onClick={() => reset()} variant="default">
						Try again
					</Button>
					<Link href="/">
						<Button variant="outline">Go to home</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
