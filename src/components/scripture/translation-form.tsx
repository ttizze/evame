import { ArrowUpFromLine } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getScriptureCopy } from "./copy";
import { buildLoginHref } from "./login-link";
import type { TranslationCandidate } from "./types";

type TranslationFormProps = {
	authenticated: boolean;
	availableLocales: Array<{ code: string; label: string }>;
	defaultLocale: string;
	onCreateTranslation: (input: {
		locale: string;
		text: string;
	}) => Promise<TranslationCandidate>;
	uiLocale?: string;
	fieldIdPrefix?: string;
	loginHref?: string;
};

export function TranslationForm({
	authenticated,
	availableLocales,
	defaultLocale,
	onCreateTranslation,
	uiLocale = "ja",
	fieldIdPrefix = "translation",
	loginHref,
}: TranslationFormProps) {
	const labels = getScriptureCopy(uiLocale);
	const resolvedLoginHref =
		loginHref ?? buildLoginHref(uiLocale, `/${uiLocale}`);
	const [locale, setLocale] = useState(defaultLocale);
	const [text, setText] = useState("");
	const [pending, setPending] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState(false);
	const localeFieldId = `${fieldIdPrefix}-locale`;
	const textFieldId = `${fieldIdPrefix}-text`;
	const helpId = `${fieldIdPrefix}-help`;

	if (!authenticated) {
		return (
			<p className="mt-4 px-4 text-sm text-muted-foreground">
				<a className="underline underline-offset-4" href={resolvedLoginHref}>
					{labels.formLogin}
				</a>
			</p>
		);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (text.trim().length === 0) {
			setError(true);
			setMessage(labels.formEmpty);
			return;
		}

		setPending(true);
		setError(false);
		setMessage(null);
		try {
			await onCreateTranslation({ locale, text });
			setText("");
			setMessage(labels.formSuccess);
		} catch {
			setError(true);
			setMessage(labels.formError);
		} finally {
			setPending(false);
		}
	}

	return (
		<form
			aria-labelledby="translation-form-title"
			className="mt-4 px-4"
			onSubmit={handleSubmit}
		>
			<h3 className="text-base font-semibold" id="translation-form-title">
				{labels.formHeadline}
			</h3>
			<p className="mt-1 text-sm leading-6 text-muted-foreground">
				{labels.formDescription}
			</p>
			<div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
				<div>
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
				<div>
					<Label htmlFor={textFieldId}>{labels.formText}</Label>
					<Textarea
						aria-describedby={helpId}
						className="mt-2 min-h-28 resize-y text-base leading-7"
						id={textFieldId}
						name="text"
						onChange={(event) => setText(event.target.value)}
						placeholder={labels.formPlaceholder}
						required
						value={text}
					/>
					<p className="mt-1 text-xs text-muted-foreground" id={helpId}>
						{labels.formHelp}
					</p>
				</div>
			</div>
			<div className="mt-4 flex flex-wrap items-center gap-3">
				<Button disabled={pending} type="submit">
					<ArrowUpFromLine aria-hidden="true" className="h-4 w-4" />
					{pending ? labels.formSubmitting : labels.formSubmit}
				</Button>
				{message ? (
					<p
						className={
							error
								? "text-sm text-destructive"
								: "text-sm text-muted-foreground"
						}
						role={error ? "alert" : "status"}
					>
						{message}
					</p>
				) : null}
			</div>
		</form>
	);
}
