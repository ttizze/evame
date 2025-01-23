// app/page.tsx (or wherever your HomePage is located)
import { auth } from "@/auth";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { signInWithGoogleAction, signInWithResendAction, signOutAction } from "./action/action";

export default async function HomePage() {
	const users = await prisma.user.findMany();
	const session = await auth();

	return (
		<div>
			<h1 className="text-2xl font-bold text-red-500">Hello</h1>
			<Link href="/about">about</Link>

			<form action={signInWithGoogleAction}>
				<button type="submit">Signin with Google</button>
			</form>

			<form action={signInWithResendAction}>
				<Input type="text" name="email" placeholder="Email" />
				<button type="submit">Signin with Resend</button>
			</form>

			{users.length > 0 &&
				users.map((user) => (
					<div className="flex flex-col p-4" key={user.id}>
						{user.name}
						{user.image}
					</div>
				))}
			{session?.user && (
				<>
					<div>{session.user.email}</div>
					<form action={signOutAction}>
						<button type="submit">Signout</button>
					</form>
				</>
			)}
		</div>
	);
}
