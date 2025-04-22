"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpenIcon, FolderOpenIcon, HomeIcon } from "lucide-react";
import { useQueryState } from "nuqs";

interface CommonTabsProps {
	children: React.ReactNode;
	defaultTab?: string;
	queryParam?: string;
}

export function CommonTabs({
	children,
	defaultTab = "home",
	queryParam = "tab",
}: CommonTabsProps) {
	const [activeTab, setActiveTab] = useQueryState(queryParam, {
		defaultValue: defaultTab,
		parse: (value) =>
			["home", "projects", "pages"].includes(value) ? value : defaultTab,
		serialize: (value) => value,
		shallow: false,
	});

	const handleTabChange = (value: string) => {
		setActiveTab(value);
	};

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
			<TabsList className="inline-flex h-9 items-center text-muted-foreground w-full justify-start rounded-none border-b bg-transparent p-0">
				<TabsTrigger
					value="home"
					className="w-1/3 inline-flex items-center justify-center whitespace-nowrap py-1 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
				>
					<HomeIcon className="w-4 h-4 mr-2" />
					Home
				</TabsTrigger>
				<TabsTrigger
					value="projects"
					className="w-1/3 inline-flex items-center justify-center whitespace-nowrap py-1 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
				>
					<FolderOpenIcon className="w-4 h-4 mr-2" />
					Projects
				</TabsTrigger>
				<TabsTrigger
					value="pages"
					className="w-1/3 inline-flex items-center justify-center whitespace-nowrap py-1 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
				>
					<BookOpenIcon className="w-4 h-4 mr-2" />
					Pages
				</TabsTrigger>
			</TabsList>
			<TabsContent value={activeTab} className="my-2">
				{children}
			</TabsContent>
		</Tabs>
	);
}
