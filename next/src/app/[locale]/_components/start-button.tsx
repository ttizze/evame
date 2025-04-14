import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
interface StartButtonProps {
	className?: string;
	text?: string;
	icon?: React.ReactNode;
}

export function StartButton({
	className,
	text = "Start",
	icon,
}: StartButtonProps) {
	return (
		<Link
			href="/auth/login"
			aria-label="Get started by logging in to your account"
		>
			<Button
				variant="default"
				className={`${className} rounded-full`}
				size="lg"
			>
				<div className="flex items-center gap-2">
					{icon && icon}
					<span className="sr-only">login and start</span>
					{text}
				</div>
			</Button>
		</Link>
	);
}
