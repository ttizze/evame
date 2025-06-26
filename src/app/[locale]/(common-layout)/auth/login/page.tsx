import { getCurrentUser } from "@/auth";
import { redirect } from "next/navigation";
import { Login } from "./login";

export default async function LoginPage() {
	const currentUser = await getCurrentUser();
	if (currentUser) {
		return redirect("/");
	}
	return <Login />;
}
