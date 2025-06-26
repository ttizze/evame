import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GitHubIntegrationTab() {
	return (
		<div className="space-y-6">
			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Repository Settings</CardTitle>
						<CardDescription>
							Configure your GitHub repository connection settings.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="repo-url">Repository URL</Label>
							<Input
								id={useId()}
								placeholder="https://github.com/username/repository"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="branch">Branch</Label>
							<Input id={useId()} placeholder="main" defaultValue="main" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="path">Content Path</Label>
							<Input
								id={useId()}
								placeholder="/content"
								defaultValue="/content"
							/>
						</div>
						<Button className="w-full">Connect Repository</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Sync Settings</CardTitle>
						<CardDescription>
							Configure how your content should be synchronized.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Auto-sync</Label>
								<p className="text-sm text-muted-foreground">
									Automatically sync changes from GitHub
								</p>
							</div>
							<Button variant="outline">Configure</Button>
						</div>
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Manual Sync</Label>
								<p className="text-sm text-muted-foreground">
									Manually sync your content now
								</p>
							</div>
							<Button variant="outline">Sync Now</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
