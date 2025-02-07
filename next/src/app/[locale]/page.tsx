// app/page.tsx (or wherever your HomePage is located)
import { auth } from "@/auth";
import { signOutAction } from "./auth-action";

export default async function HomePage() {
	const session = await auth();

	return (
		<div>
			<h1 className="text-2xl font-bold text-red-500">Hello</h1>

			{session?.user && (
				<>
					<div>{session.user.email}</div>
					<form action={signOutAction}>
						<button type="submit">Sign Out</button>
					</form>
				</>
			)}
		</div>
	);
}
