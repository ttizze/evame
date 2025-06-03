import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";

const ProfileForm = dynamic(
	() => import("./_components/profile-form").then((mod) => mod.ProfileForm),
	{ loading: () => <Skeleton className="h-[500px] w-full" /> },
);

const SettingsForm = dynamic(
	() => import("./_components/settings-form").then((mod) => mod.SettingsForm),
	{ loading: () => <Skeleton className="h-[500px] w-full" /> },
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
		<div className="">
			<Tabs defaultValue="profile" className="w-full">
				<TabsList className="mb-4 w-full flex rounded-full">
					<TabsTrigger
						value="profile"
						className="flex-1 items-center justify-center rounded-full text-sm"
					>
						Profile
					</TabsTrigger>
					<TabsTrigger
						value="settings"
						className="flex-1 items-center justify-center rounded-full text-sm"
					>
						Settings
					</TabsTrigger>
				</TabsList>

				<TabsContent value="profile">
					<ProfileForm currentUser={currentUser} />
				</TabsContent>

				<TabsContent value="settings">
					<SettingsForm currentUser={currentUser} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
