import { signIn } from "@/auth";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
	const users = await prisma.user.findMany();
	return (
		<div>
			<h1 className="text-2xl font-bold text-red-500">Hello</h1>
			<Link href="/about">about</Link>

			<form
				action={async () => {
					"use server";
					await signIn("google");
				}}
			>
				<button type="submit">Signin with Google</button>
			</form>
			<form
				action={async (formData) => {
					"use server";
					await signIn("resend", formData);
				}}
			>
				<input type="text" name="email" placeholder="Email" />
				<button type="submit">Signin with Resend</button>
			</form>
			{users.map((user) => (
				<div key={user.id}>
					{user.name}
					{user.email}
					{user.image}
				</div>
			))}
		</div>
	);
}
