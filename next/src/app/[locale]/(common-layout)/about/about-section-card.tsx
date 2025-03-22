import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface AboutSectionCardProps {
	icon: React.ReactNode;
	title: React.ReactNode;
	description: React.ReactNode;
}

export default async function AboutSectionCard({
	icon,
	title,
	description,
}: AboutSectionCardProps) {
	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="flex flex-row items-center gap-2">
				<div className="rounded-full p-2 bg-primary/10 text-primary">
					{icon}
				</div>
				<CardTitle className="text-xl">{title}</CardTitle>
			</CardHeader>
			<CardContent className="flex-1">{description}</CardContent>
		</Card>
	);
}
