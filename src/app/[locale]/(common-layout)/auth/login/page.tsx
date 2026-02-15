import type { Route } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/_service/auth-server";
import { LoginDialog } from "@/app/[locale]/(common-layout)/_components/login/_components/login-dialog.client";

export default async function LoginPage(
	props: PageProps<"/[locale]/auth/login">,
) {
	const searchParams = await props.searchParams;
	const next = resolveNextPath(
		typeof searchParams.next === "string" ? searchParams.next : null,
	);
	const currentUser = await getCurrentUser();
	if (currentUser) {
		redirect(next);
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

function resolveNextPath(next: string | null): Route {
	if (!next) return "/" as Route;
	if (!next.startsWith("/") || next.startsWith("//")) {
		return "/" as Route;
	}
	return next as Route;
}
