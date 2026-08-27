import { ClientOnly } from "@tanstack/react-router";
import { LoginDialog } from "@/app/[locale]/(common-layout)/_components/login/_components/login-dialog.client";

export default function LoginPage() {
	return (
		<div className="container mx-auto max-w-md py-8">
			<ClientOnly
				fallback={
					<div className="h-96 flex items-center justify-center text-gray-500">
						Click anywhere to open login dialog
					</div>
				}
			>
				<LoginDialog
					open={true}
					trigger={
						<div className="h-96 flex items-center justify-center text-gray-500">
							Click anywhere to open login dialog
						</div>
					}
				/>
			</ClientOnly>
		</div>
	);
}
