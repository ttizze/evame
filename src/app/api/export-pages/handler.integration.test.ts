// @vitest-environment node
import {
	TextWriter,
	Uint8ArrayReader,
	Uint8ArrayWriter,
	ZipReader,
} from "@zip.js/zip.js";
import { remark } from "remark";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JsonValue } from "@/db/types";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createSegment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";

const { getCurrentUser, getImage } = vi.hoisted(() => ({
	getCurrentUser: vi.fn(),
	getImage: vi.fn(),
}));
vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: getCurrentUser,
}));
vi.mock("cloudflare:workers", () => ({ env: { UPLOADS: { get: getImage } } }));

import { getPagesExport } from "./handler";

await setupDbPerFile(import.meta.url);
beforeEach(async () => {
	await resetDatabase();
	getCurrentUser.mockReset();
	getImage.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("Markdownと画像の一括ダウンロード", () => {
	it("同じSVGを一度だけ同梱し直接・参照形式・HTML画像のフラグメントを残す", async () => {
		const owner = await createUser();
		getCurrentUser.mockResolvedValue(owner);
		getImage.mockImplementation(async () => ({
			body: new Blob(["<svg/>"]).stream(),
			httpMetadata: { contentType: "image/svg+xml" },
		}));
		await createPage({
			userId: owner.id,
			slug: "fragment-export",
			mdastJson: remark().parse(
				'![直接](https://images.evame.tech/uploads/a.svg#view)\n\n![参照][photo]\n\n[photo]: https://images.evame.tech/uploads/a.svg#other\n\n<img src="https://images.evame.tech/uploads/a.svg#third">',
			) as unknown as JsonValue,
		});
		const response = await getPagesExport(
			new Request("https://app.example.com/api/export-pages"),
		);
		const reader = new ZipReader(
			new Uint8ArrayReader(new Uint8Array(await response.arrayBuffer())),
			{ useWebWorkers: false },
		);
		try {
			const entries = await reader.getEntries();
			expect(
				entries.filter((entry) => entry.filename.startsWith("images/")),
			).toHaveLength(1);
			const document = entries.find((entry) =>
				entry.filename.startsWith("documents/"),
			);
			if (!document || document.directory)
				throw new Error("原文が書き出されていない");
			const markdown = await document.getData(new TextWriter());
			for (const fragment of ["view", "other", "third"])
				expect(markdown).toContain(`.svg#${fragment}`);
			expect(getImage).toHaveBeenCalledTimes(1);
		} finally {
			await reader.close();
		}
	});
	it("未ログインのリクエストにはZIPを作らず401を返す", async () => {
		getCurrentUser.mockResolvedValue(null);
		const response = await getPagesExport(
			new Request("https://app.example.com/api/export-pages"),
		);
		expect(response.status).toBe(401);
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(getImage).not.toHaveBeenCalled();
	});
	it("自分の全文書を原文・メタデータ・重複しない画像で書き出し、欠けた画像を報告する", async () => {
		const owner = await createUser();
		const other = await createUser();
		getCurrentUser.mockResolvedValue(owner);
		const image = new Uint8Array([255, 216, 255, 217]);
		getImage.mockImplementation(async (key: string) =>
			key === "uploads/photo"
				? {
						body: new Blob([image]).stream(),
						httpMetadata: { contentType: "image/jpeg" },
					}
				: null,
		);
		const pages = [];
		for (const status of ["DRAFT", "PUBLIC", "ARCHIVE"] as const) {
			const page = await createPage({
				userId: owner.id,
				slug: status,
				status,
				sourceLocale: "ja",
				mdastJson: {
					type: "root",
					children: [
						{
							type: "paragraph",
							children: [{ type: "text", value: `原文-${status}` }],
						},
						{
							type: "paragraph",
							children: [
								{
									type: "image",
									url: "https://images.evame.tech/uploads/photo",
									alt: "写真",
								},
							],
						},
						{
							type: "paragraph",
							children: [
								{
									type: "image",
									url: "https://images.evame.tech/uploads/missing",
									alt: "欠けた写真",
								},
							],
						},
						{
							type: "paragraph",
							children: [
								{
									type: "image",
									url: "https://external.example/picture.png",
									alt: "外部写真",
								},
							],
						},
					],
				},
			});
			await createSegment({
				contentId: page.id,
				number: 0,
				text: `原題-${status}`,
				textAndOccurrenceHash: `${status}-title`,
			});
			pages.push(page);
		}
		await createPage({
			userId: other.id,
			slug: "another-user",
			mdastJson: {
				type: "root",
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", value: "他人の文書" }],
					},
				],
			},
		});
		const response = await getPagesExport(
			new Request(
				`https://app.example.com/api/export-pages?userId=${other.id}`,
			),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("application/zip");
		expect(response.headers.get("content-disposition")).toContain("attachment");
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(response.headers.get("vary")).toBe("Cookie, Authorization");
		const reader = new ZipReader(
			new Uint8ArrayReader(new Uint8Array(await response.arrayBuffer())),
			{ useWebWorkers: false },
		);
		try {
			const entries = await reader.getEntries();
			const images = entries.filter((entry) =>
				entry.filename.startsWith("images/"),
			);
			expect(images).toHaveLength(1);
			expect(images[0].filename).toMatch(/^images\/[a-f0-9]{64}\.jpg$/);
			if (images[0].directory)
				throw new Error("画像がディレクトリになっています");
			expect(await images[0].getData(new Uint8ArrayWriter())).toEqual(image);
			const documents = entries.filter((entry) =>
				entry.filename.startsWith("documents/"),
			);
			expect(documents).toHaveLength(3);
			for (const page of pages) {
				const entry = documents.find(
					(item) => item.filename === `documents/${page.id}-${page.slug}.md`,
				);
				if (!entry || entry.directory) throw new Error("文書がありません");
				const markdown = await entry.getData(new TextWriter());
				expect(markdown).toContain(`原文-${page.status}`);
				expect(markdown).toContain(`原題-${page.status}`);
				expect(markdown).toContain(`../${images[0].filename}`);
				expect(markdown).toContain("https://images.evame.tech/uploads/missing");
				expect(markdown).toContain("https://external.example/picture.png");
				expect(markdown).not.toContain("他人の文書");
			}
			const reportEntry = entries.find(
				(entry) => entry.filename === "export-report.json",
			);
			if (!reportEntry || reportEntry.directory)
				throw new Error("レポートがありません");
			const report = JSON.parse(await reportEntry.getData(new TextWriter()));
			expect(report.pages).toBe(3);
			expect(report.images).toBe(1);
			expect(report.warnings).toHaveLength(6);
			expect(entries.some((entry) => entry.filename === "README.md")).toBe(
				true,
			);
			expect(getImage.mock.calls.map(([key]) => key)).toEqual([
				"uploads/photo",
				"uploads/missing",
			]);
		} finally {
			await reader.close();
		}
	});
	it("R2の取得例外でも原文と画像URLを残し、同じ画像を再取得せずレポートへ記録する", async () => {
		const owner = await createUser();
		getCurrentUser.mockResolvedValue(owner);
		getImage.mockRejectedValue(new Error("R2 unavailable"));
		for (const slug of ["first", "second"])
			await createPage({
				userId: owner.id,
				slug,
				mdastJson: {
					type: "root",
					children: [
						{
							type: "paragraph",
							children: [
								{ type: "text", value: "原文を守る" },
								{
									type: "image",
									url: "https://images.evame.tech/uploads/error",
									alt: "写真",
								},
							],
						},
					],
				},
			});
		const response = await getPagesExport(
			new Request("https://app.example.com/api/export-pages"),
		);
		const reader = new ZipReader(
			new Uint8ArrayReader(new Uint8Array(await response.arrayBuffer())),
			{ useWebWorkers: false },
		);
		try {
			const entries = await reader.getEntries();
			for (const document of entries.filter((entry) =>
				entry.filename.startsWith("documents/"),
			)) {
				if (document.directory) throw new Error("文書がありません");
				const markdown = await document.getData(new TextWriter());
				expect(markdown).toContain("原文を守る");
				expect(markdown).toContain("https://images.evame.tech/uploads/error");
			}
			const report = entries.find(
				(entry) => entry.filename === "export-report.json",
			);
			if (!report || report.directory) throw new Error("レポートがありません");
			expect(JSON.parse(await report.getData(new TextWriter()))).toMatchObject({
				pages: 2,
				images: 0,
				warnings: [
					{
						reason: "image-unavailable",
						image_url: "https://images.evame.tech/uploads/error",
					},
					{
						reason: "image-unavailable",
						image_url: "https://images.evame.tech/uploads/error",
					},
				],
			});
			expect(getImage).toHaveBeenCalledOnce();
		} finally {
			await reader.close();
		}
	});
	it("空のアカウントも説明と件数を含むZIPとして書き出せる", async () => {
		getCurrentUser.mockResolvedValue(await createUser());
		const response = await getPagesExport(
			new Request("https://app.example.com/api/export-pages"),
		);
		const reader = new ZipReader(
			new Uint8ArrayReader(new Uint8Array(await response.arrayBuffer())),
			{ useWebWorkers: false },
		);
		try {
			expect(
				(await reader.getEntries()).map((entry) => entry.filename),
			).toEqual(["README.md", "export-report.json"]);
		} finally {
			await reader.close();
		}
	});
	it("変換できない文書を空本文としてZIPに含めず、ダウンロードを失敗させる", async () => {
		const owner = await createUser();
		getCurrentUser.mockResolvedValue(owner);
		await createPage({
			userId: owner.id,
			slug: "broken",
			mdastJson: {
				type: "root",
				children: [{ type: "unknown-node", value: "保護する原文" }],
			},
		});
		const response = await getPagesExport(
			new Request("https://app.example.com/api/export-pages"),
		);
		await expect(response.arrayBuffer()).rejects.toThrow();
	});
	it.each(["開始前", "画像取得中"])(
		"%sに中止されたリクエストでは書き出しを続けない",
		async (phase) => {
			const owner = await createUser();
			getCurrentUser.mockResolvedValue(owner);
			await createPage({
				userId: owner.id,
				slug: "cancel-export",
				mdastJson: {
					type: "root",
					children: [
						{
							type: "paragraph",
							children: [
								{
									type: "image",
									url: "https://images.evame.tech/uploads/abort",
									alt: "写真",
								},
							],
						},
					],
				},
			});
			const controller = new AbortController();
			if (phase === "開始前") controller.abort();
			getImage.mockImplementation(async () => {
				controller.abort();
				throw controller.signal.reason;
			});
			const response = await getPagesExport(
				new Request("https://app.example.com/api/export-pages", {
					signal: controller.signal,
				}),
			);
			await expect(response.arrayBuffer()).rejects.toThrow();
			expect(getImage).toHaveBeenCalledTimes(phase === "開始前" ? 0 : 1);
		},
	);
});
