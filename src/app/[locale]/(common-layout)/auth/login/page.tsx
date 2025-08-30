import type { Route } from "next";
import { redirect } from "next/navigation";
import { LoginDialog } from "@/app/[locale]/_components/login/_components/login-dialog.client";
import { getCurrentUser } from "@/lib/auth-server";

export default async function LoginPage() {
	const currentUser = await getCurrentUser();
	if (currentUser) {
		redirect("/" as Route);
	}
	return (
		<div className="container mx-auto max-w-md py-8">
			<LoginDialog
				open={true}
				trigger={
					<div className="h-96 flex items-center justify-center text-gray-500">
						Click anywhere to open login dialog
					</div>
				}
			/>
		</div>
	);
}
