"use client";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
interface StartButtonProps {
	className?: string;
}

export function StartButton({ className }: StartButtonProps) {
	return (
		<Link href="/auth/login">
			<Button
				variant="outline"
				className={`${className} rounded-full`}
				size="lg"
			>
				Start
			</Button>
		</Link>
	);
}
