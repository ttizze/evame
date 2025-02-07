import { useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";

const geminiModels = [
	{
		name: "gemini-1.5-flash-002",
		description: "fast",
		value: "gemini-1.5-flash-002",
	},
	{
		name: "gemini-1.5-pro-002",
		description: "high quality",
		value: "gemini-1.5-pro-002",
	},
];

interface AIModelSelectorProps {
	className?: string;
	onModelSelect: (model: string) => void;
}

export function AIModelSelector({
	onModelSelect,
	className,
}: AIModelSelectorProps) {
	const [selectedModel, setSelectedModel] = useState<string>(
		geminiModels[0].value,
	);

	const handleModelChange = (value: string) => {
		setSelectedModel(value);
		onModelSelect(value);
	};

	const getSelectedModelName = () => {
		return (
			geminiModels.find((model) => model.value === selectedModel)?.name ||
			"Select a model"
		);
	};
	return (
		<Select value={selectedModel} onValueChange={handleModelChange}>
			<SelectTrigger className={`${className}`}>
				<SelectValue>{getSelectedModelName()}</SelectValue>
			</SelectTrigger>
			<SelectContent className="">
				{geminiModels.map((model) => (
					<SelectItem key={model.value} value={model.value}>
						<div className="flex flex-col">
							<span className="font-medium">{model.name}</span>
							<span className="text-sm text-gray-500">{model.description}</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
