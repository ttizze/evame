import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
const EditProfileForm = dynamic(
	() => import("./edit-profile-form").then((mod) => mod.EditProfileForm),
	{
		loading: () => <Skeleton className="h-[500px] w-full" />,
	},
);
export const metadata: Metadata = {
	title: "Edit Profile",
};

export default async function UserEditPage({
	params,
}: {
	params: Promise<{ handle: string }>;
}) {
	const currentUser = await getCurrentUser();
	const { handle } = await params;

	if (!currentUser || currentUser.handle !== handle) {
		return redirect("/auth/login");
	}

	if (!(await fetchUserByHandle(currentUser.handle))) {
		notFound();
	}

	return (
		<div className="rounded-xl border p-4">
			<EditProfileForm currentUser={currentUser} />
		</div>
	);
}
