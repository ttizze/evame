import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function UserAvatar({
	image,
	name,
	className,
}: {
	image: string | null;
	name: string;
	className: string;
}) {
	return (
		<Avatar className={className}>
			<AvatarImage alt={name} src={image ?? undefined} />
			<AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
		</Avatar>
	);
}
