interface AboutSectionCardProps {
	icon: React.ReactNode;
	title: React.ReactNode;
	description: React.ReactNode;
	component: React.ReactNode;
}

export default async function AboutSectionCard({
	icon,
	title,
	description,
	component,
}: AboutSectionCardProps) {
	return (
		<div className="h-full flex flex-col px-8 py-8 border-b">
			<div className="flex flex-row items-center gap-2">
				{icon}
				<p className="text-lg">{title}</p>
			</div>
			<p className="text-md ">{description}</p>
			{component}
		</div>
	);
}
