import { auth } from "@/auth";

import { redirect } from "next/navigation";
import { Login } from "./login";

export default async function LoginPage() {
	const session = await auth();
	const user = session?.user;
	if (user) {
		redirect("/");
	}
	return <Login />;
}
