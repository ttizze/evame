import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { getZodConstraint } from "@conform-to/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useLocation } from "@remix-run/react";
import { useNavigation } from "@remix-run/react";
import { CheckCircle } from "lucide-react";
import { z } from "zod";
import { LocaleLink } from "~/components/LocaleLink";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { sessionStorage } from "~/utils/session.server";
import { authenticator } from "../../../../utils/auth.server";
import { GoogleForm } from "../../../resources+/google-form";
const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

export async function loader({ request }: LoaderFunctionArgs) {
	await authenticator.isAuthenticated(request, {
		successRedirect: "/",
	});
	const session = await sessionStorage.getSession(
		request.headers.get("Cookie"),
	);
	//@ts-ignore
	return { magicLinkSent: session.has("auth:magicLink") };
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.clone().formData();
	const intent = String(formData.get("intent"));
	const submission = parseWithZod(formData, { schema: loginSchema });

	if (submission.status !== "success") {
		return submission.reply();
	}

	switch (intent) {
		case "magicLink": {
			await authenticator.authenticate("magicLink", request, {
				successRedirect: "/auth/login",
				failureRedirect: "/auth/login",
			});
			return submission.reply();
		}
		case "SignInWithGoogle":
			return authenticator.authenticate("google", request, {
				successRedirect: "/",
				failureRedirect: "/auth/login",
			});
		default:
			return submission.reply({
				formErrors: ["Invalid action"],
			});
	}
}

export default function LoginPage() {
	const { magicLinkSent } = useLoaderData<typeof loader>();
	const lastResult = useActionData<typeof action>();
	const location = useLocation();
	const navigation = useNavigation();
	const [form, { email }] = useForm({
		id: "login-form",
		lastResult,
		constraint: getZodConstraint(loginSchema),
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: loginSchema });
		},
	});

	return (
		<div className="container mx-auto max-w-md py-8">
			<Card>
				<CardHeader>
					<CardTitle className="text-center font-bold text-2xl">
						Login to Evame
					</CardTitle>
				</CardHeader>
				<CardContent className="rounded-full">
					<GoogleForm redirectTo={location.pathname + location.search} />
					<Separator className="my-4" />
					<div className="text-center text-sm text-gray-500 my-2">
						Or continue with email
					</div>
					<Form method="post" {...getFormProps(form)}>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={email.id}>Email</Label>
								<Input
									{...getInputProps(email, { type: "email" })}
									className="rounded-lg"
								/>
								{email.errors && (
									<p className="text-sm text-red-500">{email.errors}</p>
								)}
							</div>
							<Button
								type="submit"
								name="intent"
								value="magicLink"
								className="w-full rounded-full"
								disabled={navigation.state === "submitting"}
							>
								Send Email
							</Button>
						</div>
						{form.errors && (
							<p className="text-red-500 text-center mt-2">{form.errors}</p>
						)}
						{magicLinkSent && (
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
					</Form>
					<div className="text-center text-sm text-gray-500 my-2">
						Login means you agree to our{" "}
						<LocaleLink to="/terms" className="underline">
							Terms of Service
						</LocaleLink>{" "}
						and{" "}
						<LocaleLink to="/privacy" className="underline">
							Privacy Policy
						</LocaleLink>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
