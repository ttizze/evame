import { lazy, type ReactNode, Suspense } from "react";
import { useLocale, useTranslations } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

const LoginMethods = lazy(() => import("./login-methods"));

export function LoginDialog({
	trigger,
	defaultOpen,
}: {
	trigger: ReactNode;
	defaultOpen: boolean;
}) {
	const locale = useLocale();
	const t = useTranslations("Footer");
	const hydrated = useHydrated();
	const redirectTo = hydrated
		? `${window.location.pathname}${window.location.search}`
		: "/";
	return (
		<Dialog defaultOpen={defaultOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="max-w-md ">
				<DialogTitle className="text-center font-bold text-2xl">
					Login to Evame
					<DialogDescription className="mt-2 flex flex-col items-center">
						Evame is multilingual blog platform.
						<a className="underline" href={`/${locale}/about`}>
							{t("aboutEvame")}
						</a>
					</DialogDescription>
				</DialogTitle>
				<Suspense fallback={null}>
					<LoginMethods redirectTo={redirectTo} />
				</Suspense>
				<div className="text-center text-sm text-gray-500 my-2">
					Login means you agree to our{" "}
					<a className="underline" href={`/${locale}/terms`}>
						Terms of Service
					</a>{" "}
					and{" "}
					<a className="underline" href={`/${locale}/privacy`}>
						Privacy Policy
					</a>
				</div>
			</DialogContent>
		</Dialog>
	);
}
