import type { Metadata, Route } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import type React from "react";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/app/_service/auth-server";
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

export default async function UserEditPage(
	props: PageProps<"/[locale]/user/[handle]/edit">,
): Promise<React.ReactNode> {
	const currentUser = await getCurrentUser();
	const { handle } = await props.params;

	if (!currentUser || currentUser.handle !== handle) {
		redirect("/auth/login" as Route);
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
