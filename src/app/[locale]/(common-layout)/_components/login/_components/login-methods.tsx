import { Separator } from "@/components/ui/separator";
import { GoogleForm } from "./google-form";
import { MagicLinkForm } from "./magic-link-form";

export default function LoginMethods({ redirectTo }: { redirectTo: string }) {
	return (
		<>
			{import.meta.env.VITE_AUTH_GOOGLE_ENABLED !== "false" && (
				<>
					<GoogleForm redirectTo={redirectTo} />
					<Separator className="my-4" />
					<div className="text-center text-sm text-gray-500 my-2">
						Or continue with email
					</div>
				</>
			)}
			<MagicLinkForm redirectTo={redirectTo} />
		</>
	);
}
