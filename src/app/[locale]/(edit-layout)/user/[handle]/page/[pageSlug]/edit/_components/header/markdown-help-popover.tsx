import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

const MARKDOWN_TIPS = [
	{ label: "Heading", example: "# Title" },
	{ label: "Bold / Italic", example: "**bold**  _italic_" },
	{ label: "Link", example: "[text](https://example.com)" },
	{ label: "List", example: "- item one\n- item two" },
	{ label: "Quote", example: "> quoted thought" },
	{ label: "Code", example: "`inline` or ```block```" },
];

export function MarkdownHelpPopover() {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					aria-label="Show Markdown help"
					className="rounded-full"
					size="icon"
					variant="ghost"
				>
					<CircleHelp className="h-4 w-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-72 rounded-xl p-4 text-sm"
				sideOffset={10}
			>
				<div className="space-y-3">
					<div>
						<p className="font-medium text-foreground">Markdown basics</p>
						<p className="text-xs text-muted-foreground">
							Use Markdown to format your explanation. These patterns are
							supported:
						</p>
					</div>
					<div className="space-y-2">
						{MARKDOWN_TIPS.map((tip) => (
							<div
								className="rounded-lg border bg-muted/30 px-3 py-2"
								key={tip.label}
							>
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{tip.label}
								</p>
								<pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground">
									{tip.example}
								</pre>
							</div>
						))}
					</div>
					<p className="text-xs text-muted-foreground">
						Add a blank line between paragraphs to keep spacing clean.
					</p>
				</div>
			</PopoverContent>
		</Popover>
	);
}
