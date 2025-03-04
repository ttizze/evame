import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
interface StartButtonProps {
	className?: string;
}

export function StartButton({ className }: StartButtonProps) {
	return (
		<Link
			href="/auth/login"
			aria-label="Get started by logging in to your account"
		>
			<Button
				variant="outline"
				className={`${className} rounded-full`}
				size="lg"
			>
				<span className="sr-only">login and start</span>
				Start
			</Button>
		</Link>
	);
}
