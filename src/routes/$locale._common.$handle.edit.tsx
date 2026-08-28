import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProfileForm } from "@/app/[locale]/(common-layout)/[handle]/edit/_components/profile-form";
import { SettingsForm } from "@/app/[locale]/(common-layout)/[handle]/edit/_components/settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfileEditData } from "./$locale/-profile-edit-data";

export const Route = createFileRoute("/$locale/_common/$handle/edit")({
	loader: async ({ params }) => {
		const currentUser = await getProfileEditData({
			data: {
				locale: params.locale,
				handle: params.handle,
			},
		});
		if (!currentUser) {
			throw notFound();
		}
		return currentUser;
	},
	head: () => ({
		meta: [{ title: "Edit Profile" }],
	}),
	component: ProfileEditRoute,
});

function ProfileEditRoute() {
	const { locale } = Route.useParams();
	const currentUser = Route.useLoaderData();

	return (
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
				<ProfileForm currentUser={currentUser} locale={locale} />
			</TabsContent>

			<TabsContent value="settings">
				<SettingsForm currentUser={currentUser} locale={locale} />
			</TabsContent>
		</Tabs>
	);
}
