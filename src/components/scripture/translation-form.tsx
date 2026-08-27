import { type FormEvent, useState } from "react";
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
};

const copy = {
	ja: {
		headline: "翻訳案を提出",
		description: "原文を確認し、選択した言語の訳文を共有できます。",
		locale: "翻訳の言語",
		text: "訳文",
		placeholder: "訳文を入力",
		help: "原文の意味を損なわない、読みやすい訳を心がけてください。",
		submit: "翻訳案を提出",
		submitting: "提出中…",
		success: "翻訳案を提出しました。",
		empty: "訳文を入力してください。",
		error: "翻訳案を提出できませんでした。時間をおいてお試しください。",
		login: "翻訳案を提出するにはログインしてください。",
	},
	en: {
		headline: "Submit a translation",
		description:
			"Review the source and share a translation in the selected language.",
		locale: "Translation language",
		text: "Translation",
		placeholder: "Write a translation",
		help: "Aim for a clear translation that preserves the meaning of the source.",
		submit: "Submit translation",
		submitting: "Submitting…",
		success: "Translation submitted.",
		empty: "Enter a translation.",
		error: "The translation could not be submitted. Please try again later.",
		login: "Log in to submit a translation.",
	},
} as const;

export function TranslationForm({
	authenticated,
	availableLocales,
	defaultLocale,
	onCreateTranslation,
	uiLocale = "ja",
	fieldIdPrefix = "translation",
}: TranslationFormProps) {
	const labels = uiLocale.toLowerCase().startsWith("ja") ? copy.ja : copy.en;
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
			<p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				{labels.login}
			</p>
		);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (text.trim().length === 0) {
			setError(true);
			setMessage(labels.empty);
			return;
		}

		setPending(true);
		setError(false);
		setMessage(null);
		try {
			await onCreateTranslation({ locale, text });
			setText("");
			setMessage(labels.success);
		} catch {
			setError(true);
			setMessage(labels.error);
		} finally {
			setPending(false);
		}
	}

	return (
		<form
			aria-labelledby="translation-form-title"
			className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
			onSubmit={handleSubmit}
		>
			<h3
				className="text-lg font-semibold text-slate-900"
				id="translation-form-title"
			>
				{labels.headline}
			</h3>
			<p className="mt-1 text-sm leading-6 text-slate-600">
				{labels.description}
			</p>
			<div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
				<div>
					<label
						className="text-sm font-medium text-slate-700"
						htmlFor={localeFieldId}
					>
						{labels.locale}
					</label>
					<select
						className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
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
					<label
						className="text-sm font-medium text-slate-700"
						htmlFor={textFieldId}
					>
						{labels.text}
					</label>
					<textarea
						aria-describedby={helpId}
						className="mt-2 min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-base leading-7 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
						id={textFieldId}
						name="text"
						onChange={(event) => setText(event.target.value)}
						placeholder={labels.placeholder}
						required
						value={text}
					/>
					<p className="mt-1 text-xs text-slate-500" id={helpId}>
						{labels.help}
					</p>
				</div>
			</div>
			<div className="mt-4 flex flex-wrap items-center gap-3">
				<button
					className="min-h-11 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
					disabled={pending}
					type="submit"
				>
					{pending ? labels.submitting : labels.submit}
				</button>
				{message ? (
					<p
						className={
							error ? "text-sm text-red-700" : "text-sm text-slate-700"
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
