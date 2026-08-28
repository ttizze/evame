import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LoginDialog } from "@/app/[locale]/(common-layout)/_components/login/_components/login-dialog";
import { getLoginData } from "./$locale/-login-data";

const loginSearch = z.object({
	next: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/$locale/_common/auth/login")({
	validateSearch: loginSearch,
	loaderDeps: ({ search }) => ({ next: search.next }),
	loader: ({ deps, params }) =>
		getLoginData({
			data: {
				locale: params.locale,
				next: deps.next,
			},
		}),
	component: LoginRoute,
});

function LoginRoute() {
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
