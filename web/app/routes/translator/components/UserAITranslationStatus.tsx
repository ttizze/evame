import { useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { UserAITranslationInfo } from "@prisma/client";
import { Link } from "@remix-run/react";
import { Form } from "@remix-run/react";
import { useNavigation } from "@remix-run/react";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { LoadingSpinner } from "~/components/LoadingSpinner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import { AIModelSelector } from "~/features/translate/components/AIModelSelector";
import { cn } from "~/utils/cn";
import { translationInputSchema } from "../types";

type UserAITranslationStatusProps = {
	userAITranslationInfo: UserAITranslationInfo[];
	targetLanguage: string;
};

export function UserAITranslationStatus({
	userAITranslationInfo = [],
	targetLanguage,
}: UserAITranslationStatusProps) {
	const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
	const navigation = useNavigation();
	const [form, fields] = useForm({
		id: "url-re-translation-form",
		constraint: getZodConstraint(translationInputSchema),
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: translationInputSchema });
		},
	});

	if (!userAITranslationInfo || userAITranslationInfo.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Translation Status ({targetLanguage})</CardTitle>
				</CardHeader>
				<CardContent>
					<p>No translation history available.</p>
				</CardContent>
			</Card>
		);
	}
	return (
		<Card>
			<CardHeader>
				<CardTitle>Translation Status ({targetLanguage})</CardTitle>
			</CardHeader>
			<CardContent>
				<ScrollArea className="h-[300px]">
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						{userAITranslationInfo.map((item) => {
							const isCompleted = item.aiTranslationStatus === "completed";
							const CardContents = (
								<Card key={item.id} className="flex flex-col h-full">
									<CardHeader>
										<CardTitle className="text-sm truncate flex flex-col h-10">
											{item.slug}
										</CardTitle>
									</CardHeader>
									<CardContent className="flex-grow flex flex-col">
										<Badge
											className="mt-2 w-full flex justify-center"
											variant={getVariantForStatus(item.aiTranslationStatus)}
										>
											{item.aiTranslationStatus}
										</Badge>
										<Progress
											value={item.aiTranslationProgress}
											className={cn(
												"mt-2",
												item.aiTranslationStatus === "in_progress" &&
													"bg-blue-400 animate-pulse",
											)}
										/>
										<p className="text-xs mt-2">
											{new Date(item.lastTranslatedAt).toLocaleString()}
										</p>
										{item.aiTranslationStatus === "failed" && (
											<div className="mt-auto pt-2">
												<Form method="post">
													<input type="hidden" name="slug" value={item.slug} />
													<div className="w-full">
														<AIModelSelector onModelSelect={setSelectedModel} />
														<input
															type="hidden"
															name="aiModel"
															value={selectedModel}
														/>
													</div>
													<Button
														type="submit"
														className="w-full"
														disabled={navigation.state === "submitting"}
													>
														{navigation.state === "submitting" ? (
															<LoadingSpinner />
														) : (
															<RotateCcw className="w-4 h-4" />
														)}
													</Button>
												</Form>
											</div>
										)}
									</CardContent>
								</Card>
							);

							return isCompleted ? (
								<Link
									key={item.id}
									to={`/reader/${encodeURIComponent(item.slug)}`}
									className="block hover:shadow-md transition-shadow duration-200"
								>
									{CardContents}
								</Link>
							) : (
								<div
									key={item.id}
									className="hover:shadow-md transition-shadow duration-200"
								>
									{CardContents}
								</div>
							);
						})}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

function getVariantForStatus(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "completed":
			return "default";
		case "in_progress":
			return "secondary";
		case "failed":
			return "destructive";
		default:
			return "outline";
	}
}
