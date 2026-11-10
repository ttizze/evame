import { describe, expect, it } from "vitest";
import { computeDocumentRevision } from "./app-document";
import { judgeDocumentWrite } from "./judge-document-write";

const page = (
	revision: string,
	status: "DRAFT" | "PUBLIC" | "ARCHIVE" = "DRAFT",
) => ({
	owned: true,
	status,
	revision,
});

describe("アプリの文書の版", () => {
	const base = {
		slug: "abc",
		title: "題",
		body: "本文",
		status: "DRAFT" as const,
	};

	it("同じ内容からは同じ版になる", () => {
		expect(computeDocumentRevision(base)).toBe(
			computeDocumentRevision({ ...base }),
		);
	});

	it("題名・本文・公開状態のどれかが変わると版も変わる", () => {
		const revision = computeDocumentRevision(base);
		expect(computeDocumentRevision({ ...base, title: "別" })).not.toBe(
			revision,
		);
		expect(computeDocumentRevision({ ...base, body: "別" })).not.toBe(revision);
		expect(computeDocumentRevision({ ...base, status: "PUBLIC" })).not.toBe(
			revision,
		);
	});

	it("題名と本文の境目をずらしても同じ版にならない", () => {
		expect(
			computeDocumentRevision({ ...base, title: "ab", body: "c" }),
		).not.toBe(computeDocumentRevision({ ...base, title: "a", body: "bc" }));
	});
});

describe("アプリからの文書の書き込みの判定", () => {
	it("まだない文書を版なしで送ると新しく作る", () => {
		expect(
			judgeDocumentWrite({
				page: null,
				expectedRevision: null,
				incomingRevision: "n",
			}),
		).toEqual({ action: "create" });
	});

	it("サーバーで消えた文書を版つきで送っても作り直さず競合にする", () => {
		expect(
			judgeDocumentWrite({
				page: null,
				expectedRevision: "old",
				incomingRevision: "n",
			}),
		).toEqual({ action: "conflict", reason: "missing" });
	});

	it("他の人の文書と同じslugなら競合にする", () => {
		expect(
			judgeDocumentWrite({
				page: { ...page("r"), owned: false },
				expectedRevision: null,
				incomingRevision: "n",
			}),
		).toEqual({ action: "conflict", reason: "slug_taken" });
	});

	it("アーカイブした文書は内容が同じでも変更しない", () => {
		expect(
			judgeDocumentWrite({
				page: page("r", "ARCHIVE"),
				expectedRevision: "r",
				incomingRevision: "r",
			}),
		).toEqual({ action: "conflict", reason: "archived" });
	});

	it("取得した版から変更していれば更新する", () => {
		expect(
			judgeDocumentWrite({
				page: page("r"),
				expectedRevision: "r",
				incomingRevision: "n",
			}),
		).toEqual({ action: "update" });
	});

	it("応答を受け取れず同じ内容を再送した場合は、古い版でも変更なしとして現在の版を返せる", () => {
		expect(
			judgeDocumentWrite({
				page: page("n"),
				expectedRevision: "r",
				incomingRevision: "n",
			}),
		).toEqual({ action: "unchanged" });
		expect(
			judgeDocumentWrite({
				page: page("n"),
				expectedRevision: null,
				incomingRevision: "n",
			}),
		).toEqual({ action: "unchanged" });
	});

	it("取得後に他で変更された文書へ別の内容を送ると競合にする", () => {
		expect(
			judgeDocumentWrite({
				page: page("s"),
				expectedRevision: "r",
				incomingRevision: "n",
			}),
		).toEqual({ action: "conflict", reason: "revision_mismatch" });
	});

	it("新規のつもりで送った文書がすでに別の内容であれば競合にする", () => {
		expect(
			judgeDocumentWrite({
				page: page("s"),
				expectedRevision: null,
				incomingRevision: "n",
			}),
		).toEqual({ action: "conflict", reason: "revision_mismatch" });
	});
});
