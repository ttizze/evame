import { getAboutCopy } from "../copy";
import { ABOUT_SECTION_HEADING_CLASS, AboutSectionContent } from "./layout";

export default function ComparisonSection({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);

	return (
		<AboutSectionContent withVerticalPadding={true}>
			<h2 className={ABOUT_SECTION_HEADING_CLASS}>{copy.comparisonTitle}</h2>
			<div className="relative mt-8">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 left-0 z-20 w-6 bg-gradient-to-r from-background to-transparent md:hidden"
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 right-0 z-20 w-6 bg-gradient-to-l from-background to-transparent md:hidden"
				/>
				<div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2 md:mx-0 md:px-0">
					<div className="min-w-[44rem] overflow-hidden rounded-2xl border border-border/60 bg-background/80">
						<table className="min-w-[44rem] w-full border-collapse text-left">
							<thead className="bg-muted/30">
								<tr>
									<th className="sticky left-0 z-20 w-48 min-w-48 bg-muted/30 py-4 pl-4 pr-4 text-xs font-semibold backdrop-blur-sm" />
									{copy.comparisonColumns.map((column) => (
										<th
											className="w-56 min-w-56 border-l border-border/60 px-4 py-4 text-xs font-semibold"
											key={column}
										>
											{column}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{copy.comparisonRows.map(
									([label, digital, conventional], index) => (
										<tr
											className={[
												index === 0 ? "" : "border-t border-border/60",
												index % 2 === 1 ? "bg-muted/10" : "",
											]
												.filter(Boolean)
												.join(" ")}
											key={label}
										>
											<th
												className={[
													"sticky left-0 z-10 w-48 min-w-48 py-4 pl-4 pr-4 text-sm font-medium align-top backdrop-blur-sm",
													index % 2 === 1 ? "bg-muted/10" : "bg-background/95",
												]
													.filter(Boolean)
													.join(" ")}
												scope="row"
											>
												{label}
											</th>
											<td className="w-56 min-w-56 border-l border-border/60 px-4 py-4 text-sm align-top">
												{digital}
											</td>
											<td className="w-56 min-w-56 border-l border-border/60 px-4 py-4 text-sm align-top">
												{conventional}
											</td>
										</tr>
									),
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</AboutSectionContent>
	);
}
