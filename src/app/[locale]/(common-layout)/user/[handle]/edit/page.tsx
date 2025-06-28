import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
			<Tabs className="w-full" defaultValue="profile">
				<TabsList className="mb-4 w-full flex rounded-full">
					<TabsTrigger
						className="flex-1 items-center justify-center rounded-full text-sm"
						value="profile"
					>
						Profile
					</TabsTrigger>
					<TabsTrigger
						className="flex-1 items-center justify-center rounded-full text-sm"
						value="settings"
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
