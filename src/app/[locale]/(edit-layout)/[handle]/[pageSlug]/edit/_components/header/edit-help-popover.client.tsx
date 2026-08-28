"use client";

import { HelpPopover } from "@/app/[locale]/(common-layout)/_components/header/help-popover.client";

export function EditHelpPopover() {
	return (
		<HelpPopover
			description={
				<div className="space-y-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
						Quick Guide
					</p>
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm font-semibold text-foreground">Heading</p>
							<p className="font-mono text-xs text-muted-foreground"># / ##</p>
						</div>
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm font-semibold text-foreground">List</p>
							<p className="font-mono text-xs text-muted-foreground">- / 1.</p>
						</div>
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm font-semibold text-foreground">Quote</p>
							<p className="font-mono text-xs text-muted-foreground">&gt;</p>
						</div>
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm font-semibold text-foreground">Divider</p>
							<p className="font-mono text-xs text-muted-foreground">---</p>
						</div>
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm font-semibold text-foreground">Link</p>
							<p className="font-mono text-xs text-muted-foreground">
								[text](url)
							</p>
						</div>
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm font-semibold text-foreground">Emphasis</p>
							<p className="font-mono text-xs text-muted-foreground">** / *</p>
						</div>
					</div>
				</div>
			}
			title="Editing Guide"
		/>
	);
}
