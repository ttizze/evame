import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueTranslate } from "@/app/[locale]/_infrastructure/qstash/enqueue-translate.server";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPersonalAccessToken,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { putAppDocument } from "./document/handler";
import { putAppDocumentStatus } from "./document-status/handler";
import { getAppDocuments } from "./documents/handler";

vi.mock(
	"@/app/[locale]/_infrastructure/qstash/enqueue-translate.server",
	() => ({
		enqueueTranslate: vi.fn(),
	}),
);

await setupDbPerFile(import.meta.url);

type AppDocument = {
	slug: string;
	title: string;
	body: string;
	status: string;
	revision: string;
};

describe("アプリの文書API", () => {
	let userId: string;
	let authorization: string;

	const request = (path: string, method = "GET", body?: unknown) =>
		new Request(`http://localhost${path}`, {
			method,
			headers: {
				Authorization: authorization,
				"Content-Type": "application/json",
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	const save = (slug: string, body: unknown) =>
		putAppDocument(request(`/api/app/documents/${slug}`, "PUT", body), slug);
	const list = async () =>
		(await (await getAppDocuments(request("/api/app/documents"))).json()) as {
			documents: AppDocument[];
			failed: { slug: string }[];
		};

	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
		const user = await createUser();
		userId = user.id;
		authorization = `Bearer ${(await createPersonalAccessToken({ userId, name: "iPhone" })).plainKey}`;
	});

	it("一覧から取得した短いCLI形式slugの記事を同じslugのまま更新する", async () => {
		await createPage({ userId, slug: "hello-world" });
		const document = (await list()).documents.find(
			(document) => document.slug === "hello-world",
		);
		expect(document).toBeDefined();
		const response = await save("hello-world", {
			title: "既存文書",
			body: "追記した本文",
			expected_revision: document?.revision,
			locale: "ja",
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			slug: "hello-world",
			title: "既存文書",
			body: expect.stringContaining("追記した本文"),
		});
	});

	it("トークンがなければ401を返す", async () => {
		authorization = "";
		expect((await getAppDocuments(request("/api/app/documents"))).status).toBe(
			401,
		);
	});

	it("新しい文書を版なしで送ると下書きとして作り、一覧で同じ題名・本文・版を返す", async () => {
		const response = await save("abc123def456", {
			title: "題名",
			body: "最初の段落\n\n- 項目",
			expected_revision: null,
			locale: "ja",
		});
		expect(response.status).toBe(201);
		const created = (await response.json()) as AppDocument;
		expect(created).toMatchObject({
			slug: "abc123def456",
			title: "題名",
			status: "DRAFT",
		});

		const { documents } = await list();
		expect(documents).toEqual([created]);
		expect(documents[0].body).toContain("最初の段落");
	});

	it("取得した版から編集して送ると更新し、公開済みの文書は公開のまま本文を反映する", async () => {
		const created = (await (
			await save("pub000000001", {
				title: "題名",
				body: "前",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		await db
			.updateTable("pages")
			.set({ status: "PUBLIC" })
			.where("slug", "=", "pub000000001")
			.execute();
		const [published] = (await list()).documents;
		expect(published.revision).not.toBe(created.revision);

		const response = await save("pub000000001", {
			title: "題名",
			body: "後",
			expected_revision: published.revision,
			locale: "ja",
		});
		expect(response.status).toBe(200);
		const updated = (await response.json()) as AppDocument;
		expect(updated).toMatchObject({ status: "PUBLIC", body: "後\n" });
		expect((await list()).documents).toEqual([updated]);
	});

	it("取得後に他で変更された文書へ別の内容を送ると、適用せず現在の文書を返す", async () => {
		const first = (await (
			await save("conflict0001", {
				title: "題",
				body: "一",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		const second = (await (
			await save("conflict0001", {
				title: "題",
				body: "二",
				expected_revision: first.revision,
				locale: "ja",
			})
		).json()) as AppDocument;

		const response = await save("conflict0001", {
			title: "題",
			body: "三",
			expected_revision: first.revision,
			locale: "ja",
		});
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			reason: "revision_mismatch",
			document: second,
		});
		expect((await list()).documents[0].body).toBe("二\n");
	});

	it("応答を受け取れず同じ内容を古い版で再送すると、変更なしとして現在の版を返す", async () => {
		const first = (await (
			await save("retry0000001", {
				title: "題",
				body: "一",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		const sent = {
			title: "題",
			body: "二",
			expected_revision: first.revision,
			locale: "ja",
		};
		const applied = (await (
			await save("retry0000001", sent)
		).json()) as AppDocument;

		const retried = await save("retry0000001", sent);
		expect(retried.status).toBe(200);
		expect(await retried.json()).toEqual(applied);
	});

	it("サーバーで消えた文書を版つきで送っても作り直さない", async () => {
		const response = await save("gone00000001", {
			title: "題",
			body: "本文",
			expected_revision: "old",
			locale: "ja",
		});
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			reason: "missing",
			document: null,
		});
		expect((await list()).documents).toEqual([]);
	});

	it("他の人の文書と同じslugでは作らず、その文書の内容も返さない", async () => {
		const other = await createUser();
		await createPage({ userId: other.id, slug: "taken0000001" });
		const response = await save("taken0000001", {
			title: "題",
			body: "本文",
			expected_revision: null,
			locale: "ja",
		});
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			reason: "slug_taken",
			document: null,
		});
	});

	it("題名の改行はWebの保存と同じく空白にする", async () => {
		const created = (await (
			await save("newline00001", {
				title: "一行目\n二行目",
				body: "本文",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		expect(created.title).toBe("一行目 二行目");
	});

	it("アーカイブした文書は変更しない", async () => {
		await createPage({ userId, slug: "archive00001", status: "ARCHIVE" });
		const response = await save("archive00001", {
			title: "題",
			body: "本文",
			expected_revision: null,
			locale: "ja",
		});
		expect(response.status).toBe(409);
		expect(((await response.json()) as { reason: string }).reason).toBe(
			"archived",
		);
	});

	it("公開中の文書は変更なしの再送でも、保留中のキャッシュの無効化を飛ばさない", async () => {
		await save("cache0000002", {
			title: "題",
			body: "本文",
			expected_revision: null,
			locale: "ja",
		});
		await db
			.updateTable("pages")
			.set({ status: "PUBLIC" })
			.where("slug", "=", "cache0000002")
			.execute();
		const [published] = (await list()).documents;
		const sent = {
			title: "題",
			body: "更新",
			expected_revision: published.revision,
			locale: "ja",
		};
		await save("cache0000002", sent);
		const retried = await save("cache0000002", sent);
		expect(retried.status).toBe(200);
		expect(retried.headers.get("X-Evame-Reader-Changed")).toBeNull();
	});

	it("公開状態は他人の文書・消えた文書・アーカイブした文書では変えず、変更なしでもキャッシュの無効化を飛ばさない", async () => {
		const other = await createUser();
		await createPage({ userId: other.id, slug: "otherstatus1" });
		await createPage({ userId, slug: "archivestat1", status: "ARCHIVE" });
		const status = (slug: string, expected: string) =>
			putAppDocumentStatus(
				request(`/api/app/documents/${slug}/status`, "PUT", {
					status: "PUBLIC",
					expected_revision: expected,
				}),
				slug,
			);
		expect(await (await status("otherstatus1", "r")).json()).toEqual({
			reason: "slug_taken",
			document: null,
		});
		expect(await (await status("missingstat1", "r")).json()).toEqual({
			reason: "missing",
			document: null,
		});
		expect(
			((await (await status("archivestat1", "r")).json()) as { reason: string })
				.reason,
		).toBe("archived");

		const created = (await (
			await save("unchanged001", {
				title: "題",
				body: "本文",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		const published = (await (
			await status("unchanged001", created.revision)
		).json()) as AppDocument;
		const again = await status("unchanged001", published.revision);
		expect(again.status).toBe(200);
		expect(again.headers.get("X-Evame-Reader-Changed")).toBeNull();
	});

	it("翻訳先の設定が空なら、Webと同じく英語と中国語へ翻訳する", async () => {
		await db
			.insertInto("userSettings")
			.values({ userId, targetLocales: [] })
			.execute();
		const created = (await (
			await save("emptylocale1", {
				title: "題",
				body: "本文",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		await putAppDocumentStatus(
			request("/api/app/documents/emptylocale1/status", "PUT", {
				status: "PUBLIC",
				expected_revision: created.revision,
			}),
			"emptylocale1",
		);
		expect(
			vi
				.mocked(enqueueTranslate)
				.mock.calls.map(([job]) => job.targetLocale)
				.sort(),
		).toEqual(["en", "zh"]);
	});

	it("下書きの保存は公開ページのキャッシュを無効化せず、公開済みの保存は無効化させる", async () => {
		const draft = await save("cache0000001", {
			title: "題",
			body: "本文",
			expected_revision: null,
			locale: "ja",
		});
		expect(draft.headers.get("X-Evame-Reader-Changed")).toBe("false");
		const created = (await draft.json()) as AppDocument;
		await db
			.updateTable("pages")
			.set({ status: "PUBLIC" })
			.where("slug", "=", "cache0000001")
			.execute();
		const [published] = (await list()).documents;
		const updated = await save("cache0000001", {
			title: "題",
			body: "更新",
			expected_revision: published.revision,
			locale: "ja",
		});
		expect(created.status).toBe("DRAFT");
		expect(updated.headers.get("X-Evame-Reader-Changed")).toBeNull();
	});

	it("別の段落を編集しても、変更していない段落は同じ段落として引き継ぐ", async () => {
		const created = (await (
			await save("segment00001", {
				title: "題",
				body: "残す段落\n\n変える段落",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		const kept = () =>
			db
				.selectFrom("segments")
				.innerJoin("pages", "pages.id", "segments.contentId")
				.select("segments.id")
				.where("pages.slug", "=", "segment00001")
				.where("segments.text", "=", "残す段落")
				.executeTakeFirstOrThrow();
		const before = await kept();
		await save("segment00001", {
			title: "題",
			body: "残す段落\n\n変えた段落",
			expected_revision: created.revision,
			locale: "ja",
		});
		expect(await kept()).toEqual(before);
	});

	it("取得した版で公開すると翻訳と購読者への通知を始め、非公開に戻すと翻訳しない", async () => {
		const subscriber = await createUser();
		await db
			.insertInto("follows")
			.values({ followerId: subscriber.id, followingId: userId })
			.execute();
		const created = (await (
			await save("status000001", {
				title: "題",
				body: "本文",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		const publish = await putAppDocumentStatus(
			request("/api/app/documents/status000001/status", "PUT", {
				status: "PUBLIC",
				expected_revision: created.revision,
			}),
			"status000001",
		);
		expect(publish.status).toBe(200);
		const published = (await publish.json()) as AppDocument;
		expect(published.status).toBe("PUBLIC");
		expect(
			await db.selectFrom("notifications").select(["userId", "type"]).execute(),
		).toEqual([{ userId: subscriber.id, type: "PAGE_PUBLISHED" }]);
		expect((await list()).documents).toEqual([published]);
		expect(
			vi
				.mocked(enqueueTranslate)
				.mock.calls.map(([job]) => job.targetLocale)
				.sort(),
		).toEqual(["en", "zh"]);

		vi.mocked(enqueueTranslate).mockClear();
		const unpublish = await putAppDocumentStatus(
			request("/api/app/documents/status000001/status", "PUT", {
				status: "DRAFT",
				expected_revision: published.revision,
			}),
			"status000001",
		);
		expect(((await unpublish.json()) as AppDocument).status).toBe("DRAFT");
		expect(enqueueTranslate).not.toHaveBeenCalled();
	});

	it("古い版で公開しようとすると、公開せず現在の文書を返す", async () => {
		const first = (await (
			await save("status000002", {
				title: "題",
				body: "一",
				expected_revision: null,
				locale: "ja",
			})
		).json()) as AppDocument;
		const second = (await (
			await save("status000002", {
				title: "題",
				body: "二",
				expected_revision: first.revision,
				locale: "ja",
			})
		).json()) as AppDocument;
		const response = await putAppDocumentStatus(
			request("/api/app/documents/status000002/status", "PUT", {
				status: "PUBLIC",
				expected_revision: first.revision,
			}),
			"status000002",
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			reason: "revision_mismatch",
			document: second,
		});
		expect(enqueueTranslate).not.toHaveBeenCalled();
	});

	it("変換できない文書があっても他の文書を返し、変換できない文書を識別できる", async () => {
		await save("good00000001", {
			title: "題",
			body: "本文",
			expected_revision: null,
			locale: "ja",
		});
		await createPage({
			userId,
			slug: "broken000001",
			mdastJson: { type: "root", children: [{ type: "unsupported-node" }] },
		});
		const { documents, failed } = await list();
		expect(documents.map((document) => document.slug)).toEqual([
			"good00000001",
		]);
		expect(failed).toEqual([{ slug: "broken000001" }]);
	});
});
