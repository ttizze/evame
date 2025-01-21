import { signIn } from "@/auth";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";

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
					console.log(formData);
					await signIn("resend", formData);
				}}
			>
				<Input type="text" name="email" placeholder="Email" />
				<button type="submit">Signin with Resend</button>
			</form>
			{users.map((user) => (
				<div key={user.id}>
					{user.name}
					{user.image}
				</div>
			))}
		</div>
	);
}
