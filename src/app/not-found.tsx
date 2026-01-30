import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Page Not Found | Evame",
	description: "The page you're looking for doesn't exist or has been moved.",
	robots: { index: false, follow: true },
};

export default function NotFound() {
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
					href="/en"
				>
					Go Home
				</Link>
				<Link
					className="px-6 py-3 border border-border rounded-full hover:bg-accent transition-colors"
					href="/en/search"
				>
					Search
				</Link>
			</div>
		</div>
	);
}
