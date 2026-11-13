import { LogIn } from "lucide-react";
import { lazy, type ReactNode, Suspense, useState } from "react";
import { useTranslations } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LoginDialog = lazy(async () => ({
	default: (await import("./login/_components/login-dialog")).LoginDialog,
}));

interface StartButtonProps {
	compactOnMobile: boolean;
	className?: string;
	text?: string;
	icon?: ReactNode;
}

export function StartButton({
	compactOnMobile,
	className,
	text = "Start",
	icon,
}: StartButtonProps) {
	const hydrated = useHydrated();
	const [hasOpened, setHasOpened] = useState(false);
	const t = useTranslations("Header");
	const { data: session } = authClient.useSession();
	const isLoggedIn = hydrated && !!session;
	if (isLoggedIn) {
		return null;
	}
	const trigger = (
		<Button
			aria-haspopup="dialog"
			className={cn(
				"relative rounded-full",
				/* ---- Inner highlight ---- */
				"before:absolute before:inset-0 before:rounded-full",
				"before:bg-[linear-gradient(145deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.05)_40%,transparent_80%)]",
				/* ---- Outer glow ---- */
				"after:absolute after:inset-0 after:rounded-full",
				"after:opacity-100 after:shadow-[0_0_20px_4px_rgba(255,255,255,0.12)]",
				className,
				compactOnMobile &&
					"max-md:size-6 max-md:p-0 max-md:bg-transparent max-md:text-foreground max-md:shadow-none max-md:before:hidden max-md:after:hidden max-md:hover:bg-transparent max-md:hover:scale-100",
			)}
			onClick={() => setHasOpened(true)}
			size="lg"
			variant="default"
		>
			<div className="flex items-center gap-2">
				{compactOnMobile && <LogIn className="h-6 w-6 md:hidden" />}
				{icon}
				<span className={compactOnMobile ? "sr-only md:hidden" : "sr-only"}>
					{compactOnMobile ? t("login") : "login and start"}
				</span>
				<span className={compactOnMobile ? "hidden md:inline" : undefined}>
					{text}
				</span>
			</div>
		</Button>
	);
	return hasOpened ? (
		<Suspense fallback={trigger}>
			<LoginDialog open trigger={trigger} />
		</Suspense>
	) : (
		trigger
	);
}
