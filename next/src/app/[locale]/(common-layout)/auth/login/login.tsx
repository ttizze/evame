"use client";
import {
	type SignInWithResendState,
	signInWithResendAction,
} from "@/app/[locale]/auth-action";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { CheckCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { GoogleForm } from "./_components/google-form";

export function Login() {
	const pathname = usePathname();
	const [state, formAction, isPending] = useActionState<
		SignInWithResendState,
		FormData
	>(signInWithResendAction, { success: false });

	return (
		<div className="container mx-auto max-w-md py-8">
			<Card>
				<CardHeader>
					<CardTitle className="text-center font-bold text-2xl">
						Login to Evame
						<CardDescription className="mt-2 flex flex-col items-center">
							Evame is multilingual blog platform.
							<Link href="/about" className="underline">
								Learn more
							</Link>
						</CardDescription>
					</CardTitle>
				</CardHeader>
				<CardContent className="rounded-full">
					<GoogleForm redirectTo={pathname} />
					<Separator className="my-4" />
					<div className="text-center text-sm text-gray-500 my-2">
						Or continue with email
					</div>
					<form action={formAction}>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Email</Label>
								<Input
									type="email"
									name="email"
									autoComplete="email"
									className="rounded-lg"
								/>
								{state.zodErrors?.email && (
									<p className="text-sm text-red-500">
										{state.zodErrors.email}
									</p>
								)}
							</div>
							<Button disabled={isPending} className="w-full rounded-full">
								Send Email
							</Button>
						</div>
						{state.success && (
							<div className="text-center p-4 space-y-3 mt-4">
								<div className="flex items-center justify-center gap-2 ">
									<CheckCircle className="h-5 w-5" />
									<p className="font-medium">Email sent successfully!</p>
								</div>
								<p className="text-sm text-slate-600">
									Please check your email.
								</p>
							</div>
						)}
					</form>
					<div className="text-center text-sm text-gray-500 my-2">
						Login means you agree to our{" "}
						<Link href="/terms" className="underline">
							Terms of Service
						</Link>{" "}
						and{" "}
						<Link href="/privacy" className="underline">
							Privacy Policy
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
