import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { commitSession, getSession } from "~/utils/session.server";
import { authenticator } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
	try {
		const user = await authenticator.authenticate("google", request, {
			failureRedirect: "/auth/login",
		});
		const session = await getSession(request.headers.get("Cookie"));
		session.set("user", user);

		return redirect("/", {
			headers: {
				"Set-Cookie": await commitSession(session),
			},
		});
	} catch (error) {
		console.error("Google authentication error:", error);
		throw error;
	}
}
