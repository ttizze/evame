// app/components/FollowListDialog.tsx

import { NavigationLink } from "@/components/navigation-link";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
type followListUser = {
	handle: string;
	name: string;
	image: string;
};

interface FollowListDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: "followers" | "following";
	users: followListUser[];
}

export function FollowListDialog({
	open,
	onOpenChange,
	type,
	users,
}: FollowListDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{type === "followers" ? "Followers" : "Following"}
					</DialogTitle>
				</DialogHeader>
				<div className="py-4">
					{users.length === 0 && <p>No users found.</p>}
					{users.length > 0 && (
						<ul className="space-y-2">
							{users.map((user) => (
								<li key={user.handle}>
									<NavigationLink
										href={`/user/${user.handle}`}
										className="underline"
									>
										{user.name} (@{user.handle})
									</NavigationLink>
								</li>
							))}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
