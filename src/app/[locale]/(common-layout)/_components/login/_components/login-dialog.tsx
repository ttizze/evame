"use client";

import { type ReactNode, useState } from "react";
import { useLocale } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { GoogleForm } from "./google-form";
import { MagicLinkForm } from "./magic-link-form";

interface LoginDialogProps {
	/**
	 * React element that will act as the dialog trigger (e.g. a button).
	 */
	trigger: ReactNode;
	/**
	 * Whether the dialog should be open by default.
	 */
	open?: boolean;
}

/**
 * Wraps the existing <Login /> component in a Radix-powered dialog so that the
 * login flow can be presented modally from anywhere in the app.
 */
export function LoginDialog({
	trigger,
	open: defaultOpen = false,
}: LoginDialogProps) {
	const [open, setOpen] = useState(defaultOpen);
	const locale = useLocale();
	const hydrated = useHydrated();
	const redirectTo = hydrated
		? `${window.location.pathname}${window.location.search}`
		: "/";
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			{/* We set max-w because the underlying <Login /> already has its own container width. */}
			<DialogContent className="max-w-md ">
				<DialogTitle className="text-center font-bold text-2xl">
					Login to Evame
					<DialogDescription className="mt-2 flex flex-col items-center">
						Evame is multilingual blog platform.
						<a className="underline" href={`/${locale}/about`}>
							Learn more
						</a>
					</DialogDescription>
				</DialogTitle>
				<GoogleForm redirectTo={redirectTo} />
				<Separator className="my-4" />
				<div className="text-center text-sm text-gray-500 my-2">
					Or continue with email
				</div>
				<MagicLinkForm redirectTo={redirectTo} />
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
