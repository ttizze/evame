"use client";
import { ArrowUpFromLine } from "lucide-react";
import { type FormEvent, useState } from "react";
import { getScriptureCopy } from "@/components/scripture/copy";
import { buildLoginHref } from "@/components/scripture/login-link";
import type { TranslationCandidate } from "@/components/scripture/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddTranslationForm({
	authenticated,
	availableLocales,
	defaultLocale,
	fieldIdPrefix = "translation",
	loginHref,
	onCreateTranslation,
	onTranslationAdded,
	uiLocale,
}: {
	authenticated: boolean;
	availableLocales: Array<{ code: string; label: string }>;
	defaultLocale: string;
	fieldIdPrefix?: string;
	loginHref?: string;
	onCreateTranslation: (input: {
		locale: string;
		text: string;
	}) => Promise<TranslationCandidate>;
	onTranslationAdded?: (translation: TranslationCandidate) => void;
	uiLocale: string;
}) {
	const labels = getScriptureCopy(uiLocale);
	const resolvedLoginHref =
		loginHref ?? buildLoginHref(uiLocale, `/${uiLocale}`);
	const [locale, setLocale] = useState(defaultLocale);
	const [text, setText] = useState("");
	const [isAddingTranslation, setIsAddingTranslation] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [hasError, setHasError] = useState(false);
	const localeFieldId = `${fieldIdPrefix}-locale`;
	const textFieldId = `${fieldIdPrefix}-text`;
	const helpId = `${fieldIdPrefix}-help`;

	if (!authenticated) {
		return (
			<span className="mt-4 px-4 block">
				<a className="text-sm text-gray-500 underline" href={resolvedLoginHref}>
					{labels.formLogin}
				</a>
			</span>
		);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (text.trim().length === 0) {
			setHasError(true);
			setMessage(labels.formEmpty);
			return;
		}

		setIsAddingTranslation(true);
		setHasError(false);
		setMessage(null);
		try {
			const translation = await onCreateTranslation({ locale, text });
			onTranslationAdded?.(translation);
			setText("");
			setMessage(labels.formSuccess);
		} catch {
			setHasError(true);
			setMessage(labels.formError);
		} finally {
			setIsAddingTranslation(false);
		}
	}

	return (
		<span className="mt-4 px-4 block">
			<form onSubmit={handleSubmit}>
				<div className="mb-3">
					<Label htmlFor={localeFieldId}>{labels.formLocale}</Label>
					<select
						className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
						id={localeFieldId}
						name="locale"
						onChange={(event) => setLocale(event.target.value)}
						value={locale}
					>
						{availableLocales.map((availableLocale) => (
							<option key={availableLocale.code} value={availableLocale.code}>
								{availableLocale.label}
							</option>
						))}
					</select>
				</div>
				<Label htmlFor={textFieldId}>{labels.formText}</Label>
				<span className="relative">
					<Textarea
						aria-describedby={helpId}
						className="w-full mb-2 rounded-xl p-2 text-base border border-gray-500 bg-background resize-none overflow-hidden"
						id={textFieldId}
						name="text"
						onChange={(event) => setText(event.target.value)}
						placeholder={labels.formPlaceholder}
						required
						value={text}
					/>
				</span>
				<p className="mt-1 text-xs text-muted-foreground" id={helpId}>
					{labels.formHelp}
				</p>
				<span className="space-x-2 flex justify-end items-center">
					{message ? (
						<p
							className={
								hasError ? "text-red-500 text-sm" : "text-gray-500 text-sm"
							}
							role={hasError ? "alert" : "status"}
						>
							{message}
						</p>
					) : null}
					<Button
						className="rounded-xl"
						disabled={isAddingTranslation}
						type="submit"
					>
						<ArrowUpFromLine className="h-4 w-4" />
						{isAddingTranslation ? labels.formSubmitting : labels.formSubmit}
					</Button>
				</span>
			</form>
		</span>
	);
}
