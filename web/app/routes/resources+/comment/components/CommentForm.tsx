import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import { Textarea } from "../../../../components/ui/textarea";

interface CommentFormProps {
	pageId: number;
	onSuccess?: () => void;
}

export function CommentForm({ pageId, onSuccess }: CommentFormProps) {
	const { t } = useTranslation();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!content.trim() || isSubmitting) return;

		setIsSubmitting(true);
		try {
			const formData = new FormData();
			formData.append("pageId", pageId.toString());
			formData.append("content", content);
			formData.append("intent", "create");

			const response = await fetch("/resources/comment", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to post comment");
			}

			setContent("");
			onSuccess?.();
		} catch (error) {
			console.error("Failed to post comment:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				placeholder={t("comment.placeholder")}
				className="min-h-[100px]"
			/>
			<Button
				type="submit"
				disabled={isSubmitting || !content.trim()}
				className="w-full"
			>
				{isSubmitting ? t("comment.posting") : t("comment.post")}
			</Button>
		</form>
	);
}
