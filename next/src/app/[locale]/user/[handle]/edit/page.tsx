import { auth } from "@/auth";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserByHandle } from "./db/queries.server";
import { EditProfileForm } from "./edit-profile-form";
export const metadata: Metadata = {
	title: "Edit Profile",
};

interface Props {
	params: {
		handle: string;
	};
}

export default async function UserEditPage({ params }: Props) {
	const session = await auth();
	const currentUser = session?.user;
	const { handle } = await params;

	if (!currentUser || currentUser.handle !== handle) {
		redirect("/auth/login");
	}

	if (!(await getUserByHandle(currentUser.handle))) {
		notFound();
	}

	return (
		<div className="container mx-auto">
			<div className="rounded-xl border p-4">
				<Suspense fallback={<div>Loading...</div>}>
					<EditProfileForm currentUser={currentUser} />
				</Suspense>
			</div>
		</div>
	);
}
