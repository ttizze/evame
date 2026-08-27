import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScriptureBreadcrumbs } from "./scripture-breadcrumbs";
import { ScriptureIndex } from "./scripture-index";
import { ScriptureReader } from "./scripture-reader";
import { TranslationForm } from "./translation-form";
import { AiTranslationJob } from "./translation-job";
import type { ScriptureDetail, ScriptureListItem } from "./types";

const items: ScriptureListItem[] = [
	{
		id: "dhammapada-1",
		slug: "dhammapada-1",
		title: "法句経 1",
		paliTitle: "Yamakavagga 1",
		hierarchy: ["経蔵", "小部", "法句経"],
		description: "心を起点とする二つの道を説く偈頌。",
		translationCount: 2,
		href: "/ja/dhammapada-1",
	},
	{
		id: "dhammapada-2",
		slug: "dhammapada-2",
		title: "法句経 2",
		paliTitle: "Yamakavagga 2",
		hierarchy: ["経蔵", "小部", "法句経"],
		description: "思いと行いの関係を説く偈頌。",
		translationCount: 1,
		href: "/ja/dhammapada-2",
	},
];

const detail: ScriptureDetail = {
	id: "dhammapada-1",
	slug: "dhammapada-1",
	title: "法句経 1",
	paliTitle: "Yamakavagga 1",
	hierarchy: ["経蔵", "小部", "法句経"],
	sourceText:
		"Manopubbaṅgamā dhammā, manoseṭṭhā manomayā;\nmanasā ce paduṭṭhena, bhāsati vā karoti vā.",
	segments: [
		{
			id: "segment-primary",
			kind: "PRIMARY",
			position: 0,
			sourceText:
				"Manopubbaṅgamā dhammā, manoseṭṭhā manomayā;\nmanasā ce paduṭṭhena, bhāsati vā karoti vā.",
			translations: [
				{
					id: "translation-a",
					locale: "ja",
					text: "ものごとは心に導かれ、心を主とし、心から成る。\n汚れた心で語り、行うなら、苦しみはその人につき従う。",
					voteCount: 12,
					votedByViewer: false,
					userName: "Translator One",
					userHandle: "translator-one",
					userProfile: "",
					userIsAi: false,
					userTotalPoints: 10,
					ownedByViewer: true,
				},
				{
					id: "translation-b",
					locale: "ja",
					text: "すべては心を先として、心を最上とし、心によって作られる。",
					voteCount: 8,
					votedByViewer: true,
					userName: "Translator Two",
					userHandle: "translator-two",
					userProfile: "",
					userIsAi: false,
					userTotalPoints: 8,
					ownedByViewer: false,
				},
			],
		},
	],
	translations: [
		{
			id: "translation-a",
			locale: "ja",
			text: "ものごとは心に導かれ、心を主とし、心から成る。\n汚れた心で語り、行うなら、苦しみはその人につき従う。",
			voteCount: 12,
			votedByViewer: false,
			userName: "Translator One",
			userHandle: "translator-one",
			userProfile: "",
			userIsAi: false,
			userTotalPoints: 10,
			ownedByViewer: true,
		},
		{
			id: "translation-b",
			locale: "ja",
			text: "すべては心を先として、心を最上とし、心によって作られる。",
			voteCount: 8,
			votedByViewer: true,
			userName: "Translator Two",
			userHandle: "translator-two",
			userProfile: "",
			userIsAi: false,
			userTotalPoints: 8,
			ownedByViewer: false,
		},
	],
	annotationLinks: [],
};

describe("ScriptureBreadcrumbs", () => {
	it("現在地を含む階層を読み上げ可能なナビとして表示する", () => {
		render(
			<ScriptureBreadcrumbs
				items={[
					{ label: "経蔵", href: "/ja" },
					{ label: "小部", href: "/ja/khuddaka" },
					{ label: "法句経 1", current: true },
				]}
			/>,
		);

		const navigation = screen.getByRole("navigation", {
			name: "仏典の階層",
		});
		expect(
			within(navigation).getByRole("link", { name: "経蔵" }),
		).toHaveAttribute("href", "/ja");
		expect(
			within(navigation).getByText("法句経 1", { selector: "span" }),
		).toHaveAttribute("aria-current", "page");
	});
});

describe("ScriptureIndex", () => {
	it("パーリ語の題名と日本語の仏典一覧を表示する", () => {
		render(<ScriptureIndex items={items} />);

		expect(
			screen.getByRole("heading", { name: "パーリ語仏典を読む" }),
		).toBeInTheDocument();
		expect(screen.getByText("Yamakavagga 1")).toHaveAttribute("lang", "pi");
		expect(screen.getByRole("link", { name: /法句経 1/ })).toHaveAttribute(
			"href",
			"/ja/dhammapada-1",
		);
		expect(screen.getByText("翻訳 2候補")).toBeInTheDocument();
		expect(
			screen.queryByText(/記事|投稿|コメント|いいね|翻訳を追加/),
		).not.toBeInTheDocument();
	});

	it("収録がないときは空状態を案内する", () => {
		render(<ScriptureIndex items={[]} />);

		expect(
			screen.getByText("公開されている仏典はまだありません。"),
		).toBeInTheDocument();
	});

	it("一覧は既存画面と同じ番号付きの境界線行で表示する", () => {
		render(<ScriptureIndex items={items} />);

		const firstRow = screen.getAllByRole("article")[0];
		expect(firstRow).toHaveClass("border-b");
		expect(firstRow).not.toHaveClass("rounded-2xl");
		expect(firstRow.querySelector("a > h2")).toHaveTextContent("法句経 1");
	});
});

describe("ScriptureReader", () => {
	it("パーリ原文と日本語翻訳候補を階層付きで表示する", () => {
		render(
			<ScriptureReader authenticated={true} detail={detail} onVote={vi.fn()} />,
		);

		expect(
			screen.getByRole("heading", { name: "法句経 1" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "パーリ原文" }),
		).toBeInTheDocument();
		expect(screen.getByText(/Manopubṅgamā|Manopub/)).toHaveAttribute(
			"lang",
			"pi",
		);
		expect(
			screen.getByRole("heading", { name: "翻訳候補" }),
		).toBeInTheDocument();
		expect(screen.getByText(/ものごとは心に導かれ/)).toHaveAttribute(
			"lang",
			"ja",
		);
		expect(
			screen.getByRole("navigation", { name: "仏典の階層" }),
		).toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: "この訳に投票" }),
		).toHaveLength(1);
		expect(
			screen.getAllByRole("button", { name: "この訳に反対票" }),
		).toHaveLength(1);
		expect(
			screen.getAllByRole("button", { name: "投票を取り消す" }),
		).toHaveLength(1);
	});

	it("未ログインで投票するとログインを促し、投票処理を呼ばない", async () => {
		const user = userEvent.setup();
		const onVote = vi.fn();
		render(
			<ScriptureReader authenticated={false} detail={detail} onVote={onVote} />,
		);

		await user.click(
			screen.getAllByRole("button", { name: "この訳に投票" })[0],
		);

		expect(onVote).not.toHaveBeenCalled();
		expect(screen.getByRole("status").textContent).toContain(
			"投票するにはログインが必要です",
		);
		expect(
			screen.getByRole("link", { name: "投票するにはログインが必要です。" }),
		).toHaveAttribute("href", "/login?locale=ja&redirect=%2Fja%2Fdhammapada-1");
	});

	it("投票が成功すると対象候補の票数と状態を更新する", async () => {
		const user = userEvent.setup();
		const onVote = vi.fn().mockResolvedValue({
			voted: true,
			voteCount: 13,
		});
		render(
			<ScriptureReader authenticated={true} detail={detail} onVote={onVote} />,
		);

		await user.click(
			screen.getAllByRole("button", { name: "この訳に投票" })[0],
		);

		expect(onVote).toHaveBeenCalledWith({
			candidateId: "translation-a",
			value: "up",
		});
		expect(screen.getByText("13票")).toBeInTheDocument();
		const firstCandidate = screen
			.getByText(/ものごとは心に導かれ/)
			.closest("li");
		expect(firstCandidate).not.toBeNull();
		expect(
			within(firstCandidate as HTMLElement).getByRole("button", {
				name: "投票を取り消す",
			}),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("選択中の投票を取り消すと現在の方向をremoveとして渡す", async () => {
		const user = userEvent.setup();
		const onVote = vi.fn().mockResolvedValue({ voted: null, voteCount: 7 });
		render(
			<ScriptureReader authenticated={true} detail={detail} onVote={onVote} />,
		);

		await user.click(screen.getByRole("button", { name: "投票を取り消す" }));

		expect(onVote).toHaveBeenCalledWith({
			candidateId: "translation-b",
			value: "remove",
			currentVote: true,
		});
	});

	it("閲覧の表示切替と投票は既存shadcnコントロールの見た目を使う", () => {
		render(
			<ScriptureReader authenticated={true} detail={detail} onVote={vi.fn()} />,
		);

		expect(screen.getByRole("button", { name: "原文のみ" })).toHaveClass(
			"border-input",
		);
		expect(
			screen.getAllByRole("button", { name: "この訳に投票" })[0],
		).toHaveClass("hover:bg-accent");
	});

	it("複数segmentの候補を混ぜず、リンクされたCOMMENTARYを注釈として表示する", () => {
		const segmentedDetail: ScriptureDetail = {
			...detail,
			sourceText: "First source\n\nSecond source",
			segments: [
				{
					id: "segment-first",
					kind: "PRIMARY",
					position: 0,
					sourceText: "First source",
					translations: [
						{
							id: "translation-first",
							locale: "en",
							text: "First translation",
							voteCount: 4,
							votedByViewer: null,
							userName: "First translator",
							userHandle: "first-translator",
							userProfile: "",
							userIsAi: false,
							userTotalPoints: 4,
							ownedByViewer: false,
						},
					],
				},
				{
					id: "segment-note",
					kind: "COMMENTARY",
					position: 1,
					sourceText: "Annotation source",
					translations: [],
				},
				{
					id: "segment-second",
					kind: "PRIMARY",
					position: 2,
					sourceText: "Second source",
					translations: [
						{
							id: "translation-second",
							locale: "en",
							text: "Second translation",
							voteCount: 2,
							votedByViewer: null,
							userName: "Second translator",
							userHandle: "second-translator",
							userProfile: "",
							userIsAi: false,
							userTotalPoints: 2,
							ownedByViewer: false,
						},
					],
				},
			],
			annotationLinks: [
				{
					mainSegmentId: "segment-first",
					annotationSegmentId: "segment-note",
					createdAt: "2026-01-01T00:00:00.000Z",
				},
			],
			displayLocale: "en",
		};
		render(
			<ScriptureReader
				authenticated={true}
				detail={segmentedDetail}
				locale="en"
				onVote={vi.fn()}
			/>,
		);

		const firstSource = screen.getByText("First source").closest("section");
		expect(firstSource).not.toBeNull();
		expect(
			within(firstSource as HTMLElement).getByText("First translation"),
		).toBeInTheDocument();
		expect(
			within(firstSource as HTMLElement).queryByText("Second translation"),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("complementary", { name: "Annotation" }),
		).toHaveTextContent("Annotation source");
		const secondSource = screen.getByText("Second source").closest("section");
		expect(secondSource).not.toBeNull();
		expect(
			within(secondSource as HTMLElement).getByText("Second translation"),
		).toBeInTheDocument();
		expect(
			within(secondSource as HTMLElement).queryByText("First translation"),
		).not.toBeInTheDocument();
	});

	it("候補の作者情報とAIラベルを表示し、所有者だけに削除操作を出す", async () => {
		const user = userEvent.setup();
		const onDeleteTranslation = vi.fn().mockResolvedValue(undefined);
		const authoredDetail: ScriptureDetail = {
			...detail,
			segments: detail.segments.map((segment) => ({
				...segment,
				translations: segment.translations.map((candidate, index) => ({
					...candidate,
					userName: index === 0 ? "Alice" : "Evame AI",
					userHandle: index === 0 ? "alice" : "evame-ai",
					userProfile: index === 0 ? "研究者" : "",
					userIsAi: index === 1,
					userTotalPoints: index === 0 ? 18 : 42,
					ownedByViewer: index === 0,
				})),
			})),
			translations: detail.translations.map((candidate, index) => ({
				...candidate,
				userName: index === 0 ? "Alice" : "Evame AI",
				userHandle: index === 0 ? "alice" : "evame-ai",
				userProfile: index === 0 ? "研究者" : "",
				userIsAi: index === 1,
				userTotalPoints: index === 0 ? 18 : 42,
				ownedByViewer: index === 0,
			})),
		};

		const { unmount } = render(
			<ScriptureReader
				authenticated={true}
				detail={authoredDetail}
				onDeleteTranslation={onDeleteTranslation}
				onVote={vi.fn()}
			/>,
		);

		expect(screen.getByText("作成者: Alice (@alice)")).toBeInTheDocument();
		expect(
			screen.getByText("作成者: Evame AI (@evame-ai)"),
		).toBeInTheDocument();
		expect(screen.getByText("(AI翻訳)")).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "削除" })).toHaveLength(1);

		await user.click(screen.getByRole("button", { name: "削除" }));
		expect(onDeleteTranslation).toHaveBeenCalledWith("translation-a");
		expect(screen.queryByText(/ものごとは心に導かれ/)).not.toBeInTheDocument();

		unmount();
		render(
			<ScriptureReader
				authenticated={false}
				detail={authoredDetail}
				onDeleteTranslation={onDeleteTranslation}
				onVote={vi.fn()}
			/>,
		);
		expect(
			screen.queryByRole("button", { name: "削除" }),
		).not.toBeInTheDocument();
	});

	it("代替候補は初期3件に制限し、すべて表示と折りたたみを切り替える", async () => {
		const user = userEvent.setup();
		const candidates = Array.from({ length: 5 }, (_, index) => ({
			...detail.segments[0].translations[0],
			id: `translation-${index + 1}`,
			text: index === 0 ? "Best translation" : `Alternative ${index}`,
			voteCount: 10 - index,
			ownedByViewer: false,
		}));
		const manyTranslationsDetail: ScriptureDetail = {
			...detail,
			segments: [
				{
					...detail.segments[0],
					translations: candidates,
				},
			],
			translations: candidates,
		};

		render(
			<ScriptureReader
				authenticated={true}
				detail={manyTranslationsDetail}
				onVote={vi.fn()}
			/>,
		);

		expect(screen.getByText("Alternative 1")).toBeInTheDocument();
		expect(screen.getByText("Alternative 3")).toBeInTheDocument();
		expect(screen.queryByText("Alternative 4")).not.toBeInTheDocument();
		const showAll = screen.getByRole("button", {
			name: "すべての翻訳を表示",
		});
		expect(showAll).toHaveAttribute("aria-expanded", "false");
		await user.click(showAll);
		expect(screen.getByText("Alternative 4")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "翻訳を折りたたむ" }),
		).toHaveAttribute("aria-expanded", "true");
	});

	it("既存の5言語コピーを使い、未対応localeは英語へフォールバックする", () => {
		render(
			<ScriptureReader
				authenticated={true}
				detail={{ ...detail, displayLocale: "es" }}
				locale="es"
				onVote={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Traducciones candidatas" }),
		).toBeInTheDocument();

		const { unmount } = render(
			<ScriptureReader
				authenticated={true}
				detail={{ ...detail, displayLocale: "ar" }}
				locale="ar"
				onVote={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Translation candidates" }),
		).toBeInTheDocument();
		unmount();
	});
});

describe("TranslationForm", () => {
	it("認証済み利用者が言語と訳文を送信できる", async () => {
		const user = userEvent.setup();
		const onCreateTranslation = vi.fn().mockResolvedValue({
			id: "translation-c",
			locale: "en",
			text: "The mind precedes all things.",
			voteCount: 0,
			votedByViewer: null,
			userName: "Translator",
			userHandle: "translator",
			userProfile: "",
			userIsAi: false,
			userTotalPoints: 0,
			ownedByViewer: true,
		});
		render(
			<TranslationForm
				authenticated={true}
				availableLocales={[
					{ code: "ja", label: "日本語" },
					{ code: "en", label: "English" },
				]}
				defaultLocale="en"
				onCreateTranslation={onCreateTranslation}
			/>,
		);

		await user.type(
			screen.getByRole("textbox", { name: "訳文" }),
			"The mind precedes all things.",
		);
		await user.click(screen.getByRole("button", { name: "翻訳案を提出" }));

		expect(onCreateTranslation).toHaveBeenCalledWith({
			locale: "en",
			text: "The mind precedes all things.",
		});
		expect(screen.getByRole("status")).toHaveTextContent(
			"翻訳案を提出しました",
		);
	});

	it("未ログイン利用者には翻訳案フォームを表示しない", () => {
		render(
			<TranslationForm
				authenticated={false}
				availableLocales={[{ code: "ja", label: "日本語" }]}
				defaultLocale="ja"
				onCreateTranslation={vi.fn()}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "翻訳案を提出" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", {
				name: "翻訳案を提出するにはログインしてください。",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", {
				name: "翻訳案を提出するにはログインしてください。",
			}),
		).toHaveAttribute("href", "/login?locale=ja&redirect=%2Fja");
	});
});

describe("AiTranslationJob", () => {
	it("AI翻訳を開始して完了状態を表示する", async () => {
		const user = userEvent.setup();
		const createTranslationJob = vi.fn().mockResolvedValue({
			id: "job-1",
			status: "COMPLETED" as const,
		});
		const getTranslationJob = vi.fn();
		render(
			<AiTranslationJob
				authenticated={true}
				createTranslationJob={createTranslationJob}
				getTranslationJob={getTranslationJob}
				locale="ja"
				scriptureId="dhammapada-1"
			/>,
		);

		await user.click(screen.getByRole("button", { name: "AI翻訳を開始" }));

		expect(createTranslationJob).toHaveBeenCalledWith({
			locale: "ja",
			scriptureId: "dhammapada-1",
		});
		expect(screen.getByText("完了")).toBeInTheDocument();
		expect(getTranslationJob).not.toHaveBeenCalled();
	});

	it("AI翻訳モデルを選択してジョブを開始できる", async () => {
		const user = userEvent.setup();
		const createTranslationJob = vi.fn().mockResolvedValue({
			id: "job-2",
			status: "PENDING" as const,
		});
		render(
			<AiTranslationJob
				authenticated={true}
				createTranslationJob={createTranslationJob}
				getTranslationJob={vi.fn()}
				locale="en"
				scriptureId="dhammapada-1"
			/>,
		);

		await user.selectOptions(
			screen.getByRole("combobox", { name: "Translation model" }),
			"deepseek-reasoner",
		);
		await user.click(
			screen.getByRole("button", { name: "Start AI translation" }),
		);

		expect(createTranslationJob).toHaveBeenCalledWith({
			locale: "en",
			model: "deepseek-reasoner",
			scriptureId: "dhammapada-1",
		});
	});

	it("未ログイン利用者にはAI翻訳の開始操作を表示しない", () => {
		render(
			<AiTranslationJob
				authenticated={false}
				createTranslationJob={vi.fn()}
				getTranslationJob={vi.fn()}
				locale="ja"
				scriptureId="dhammapada-1"
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "AI翻訳を開始" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", {
				name: "AI翻訳を利用するにはログインしてください。",
			}),
		).toHaveAttribute("href", "/login?locale=ja&redirect=%2Fja");
	});
});
