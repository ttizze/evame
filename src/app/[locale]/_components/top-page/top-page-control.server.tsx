import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const DynamicFloatingControls = dynamic(
	() =>
		import("@/app/[locale]/_components/floating-controls.client").then(
			(mod) => mod.FloatingControls,
		),
	{
		loading: () => <Skeleton className="h-[845px] w-full" />,
	},
);

export default async function Control() {
	return <DynamicFloatingControls />;
}
