"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
interface StartButtonProps {
	className?: string;
}

export function StartButton({ className }: StartButtonProps) {
	const router = useRouter();
	return (
		<Button
			onClick={() => router.push("/auth/login")}
			variant="outline"
			className={`${className} rounded-full`}
			size="lg"
		>
			Start
		</Button>
	);
}
