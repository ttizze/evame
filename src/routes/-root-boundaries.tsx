import * as Sentry from "@sentry/tanstackstart-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function RootErrorComponent({ error, reset }: ErrorComponentProps) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	const digest =
		"digest" in error && typeof error.digest === "string"
			? error.digest
			: undefined;

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
					{digest && (
						<p className="text-sm text-muted-foreground">
							Error code:{" "}
							<code className="rounded bg-muted px-1 py-0.5">{digest}</code>
						</p>
					)}
				</div>

				<div className="flex gap-2">
					<Button onClick={reset} variant="default">
						Try again
					</Button>
					<Link to="/">
						<Button variant="outline">Go to home</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}

export function RootNotFoundComponent() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center px-4">
			<h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
			<h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
			<p className="text-muted-foreground mb-8 text-center max-w-md">
				The page you're looking for doesn't exist or has been moved.
			</p>
			<div className="flex gap-4">
				<Link
					className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
					params={{ locale: "en" }}
					to="/$locale"
				>
					Go Home
				</Link>
				<Link
					className="px-6 py-3 border border-border rounded-full hover:bg-accent transition-colors"
					params={{ locale: "en" }}
					to="/$locale/search"
				>
					Search
				</Link>
			</div>
		</div>
	);
}

export function RoutePendingComponent() {
	return (
		<div
			aria-label="Loading"
			aria-valuemax={100}
			aria-valuemin={0}
			className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/20"
			role="progressbar"
		>
			<div className="h-full w-1/3 animate-pulse bg-primary" />
		</div>
	);
}
