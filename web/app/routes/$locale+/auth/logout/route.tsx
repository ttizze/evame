import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { authenticator } from "../../../../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});

	return { currentUser };
}

export async function action({ request }: ActionFunctionArgs) {
	return await authenticator.logout(request, { redirectTo: "/" });
}
export default function Logout() {
	const { currentUser } = useLoaderData<typeof loader>();
	return (
		<div className="container mx-auto max-w-md py-8">
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl font-bold text-center">
						Logout
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-center mb-4">
						<span className="font-semibold">{currentUser.userName}</span>
					</p>
					<p className="text-center text-sm text-gray-60 mb-4">
						Are you sure you want to logout?
					</p>
				</CardContent>
				<CardFooter>
					<Form method="POST" className="w-full">
						<Button
							type="submit"
							name="action"
							value="logout"
							className="w-full"
						>
							Logout
						</Button>
					</Form>
				</CardFooter>
			</Card>
		</div>
	);
}
