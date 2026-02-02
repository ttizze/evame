"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { HelpPopover } from "./help-popover.client";

export function TranslationHelpPopover() {
	const t = useTranslations("Header.HelpPopover.translationHelp");
	return (
		<HelpPopover
			description={
				<div className="space-y-3">
					<p>{t("description1")}</p>
					<div className="rounded-lg border border-foreground/10  px-3 py-2">
						<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
							{t("controllerLabel")}
						</p>
						<div className="mt-2 flex items-center gap-2">
							<span className="rounded-full border border-foreground/15 px-3 py-1 text-xs font-semibold text-foreground">
								{t("controllerButton")}
							</span>
							<span className="text-foreground">{t("controllerHint")}</span>
						</div>
					</div>
					<p className="text-muted-foreground">{t("description2")}</p>
					<div className="rounded-lg border border-foreground/10 px-3 py-2">
						<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
							{t("panelLabel")}
						</p>
						<div className="mt-2 space-y-1 text-xs">
							<div className="rounded-md  px-2 py-1 text-muted-foreground">
								{t("originalLine")}
							</div>
							<div className="rounded-md px-2 py-1 font-semibold text-foreground">
								{t("translationLine")}
							</div>
						</div>
						<div className="mt-3 space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">{t("by")} Alice</span>
								<div className="flex items-center gap-1">
									<span className="grid h-5 w-5 place-items-center rounded-full border border-foreground/15 bg-foreground/5">
										<ThumbsUp className="h-3 w-3 text-muted-foreground" />
									</span>
									<span className="grid h-5 w-5 place-items-center rounded-full border border-foreground/15 bg-foreground/5">
										<ThumbsDown className="h-3 w-3 text-muted-foreground" />
									</span>
								</div>
							</div>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<span className="h-3 w-3 rounded-full bg-foreground/10" />
								{t("otherTranslations")}
							</div>
							<div className="space-y-1">
								<div className="flex items-center justify-between rounded-md border border-foreground/10 bg-foreground/5 px-2 py-1 text-xs">
									<span className="text-foreground">
										{t("shortTranslation")}
									</span>
									<div className="flex items-center gap-1">
										<span className="grid h-5 w-5 place-items-center rounded-full border border-foreground/15 bg-foreground/5">
											<ThumbsUp className="h-3 w-3 text-muted-foreground" />
										</span>
										<span className="grid h-5 w-5 place-items-center rounded-full border border-foreground/15 bg-foreground/5">
											<ThumbsDown className="h-3 w-3 text-muted-foreground" />
										</span>
									</div>
								</div>
								<div className="flex items-center justify-between rounded-md border border-foreground/10 bg-foreground/5 px-2 py-1 text-xs">
									<span className="text-foreground">
										{t("anotherTranslation")}
									</span>
									<div className="flex items-center gap-1">
										<span className="grid h-5 w-5 place-items-center rounded-full border border-foreground/15 bg-foreground/5">
											<ThumbsUp className="h-3 w-3 text-muted-foreground" />
										</span>
										<span className="grid h-5 w-5 place-items-center rounded-full border border-foreground/15 bg-foreground/5">
											<ThumbsDown className="h-3 w-3 text-muted-foreground" />
										</span>
									</div>
								</div>
							</div>
							<div className="rounded-md border border-dashed border-foreground/20 px-2 py-2 text-xs text-muted-foreground">
								{t("addTranslation")}
							</div>
						</div>
					</div>
				</div>
			}
			title={t("title")}
		/>
	);
}
