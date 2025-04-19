import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { processProjectHtml } from "./process-project-html";

/**
 * Project ⇔ ProjectSegment 関連テスト
 *
 * processProjectHtml(
 *   projectId: string,
 *   title: string,
 *   descriptionHtml: string,
 *   userId: string,
 *   sourceLocale: string,
 * )
 */

describe("processProjectHtml – integration", () => {
	let user: User;

	beforeEach(async () => {
		// DB をクリーンに
		await prisma.projectSegment.deleteMany();
		await prisma.project.deleteMany();
		await prisma.user.deleteMany();

		user = await prisma.user.create({
			data: {
				handle: "tester",
				name: "Tester",
				email: "tester@example.com",
				image: "",
			},
		});
	});

	afterEach(async () => {
		await prisma.projectSegment.deleteMany();
		await prisma.project.deleteMany();
		await prisma.user.deleteMany();
	});

	afterAll(async () => {
		await prisma.$disconnect();
	});

	// 1. 基本動作
	test("HTML を処理して Project / ProjectSegment / data-number-id を生成する", async () => {
		const title = "Title";
		const htmlInput = `
			<p>This is a test.</p>
			<p>This is another test.</p>
		`;
		const tagLine = "Tag Line";
		const project = await prisma.project.create({
			data: {
				userId: user.id,
				description: htmlInput,
				title,
				sourceLocale: "en",
			},
		});
		await processProjectHtml(project.id, tagLine, htmlInput, user.id);
		const createdProject = await prisma.project.findUnique({
			where: { id: project.id },
			include: { projectSegments: true },
		});
		expect(createdProject).not.toBeNull();
		if (!createdProject) return;

		// Segment が挿入され連番になっている
		expect(createdProject.projectSegments.length).toBe(3);
		expect(createdProject.projectSegments[0].number).toBe(0);
		expect(createdProject.projectSegments[1].number).toBe(1);

		// textAndOccurrenceHash が入る
		for (const seg of createdProject.projectSegments) {
			expect(seg.textAndOccurrenceHash).toBeTruthy();
		}

		// HTML に <span data-number-id> が埋め込まれている
		expect(createdProject.description).toMatch(
			/<span data-number-id="\d+">This is a test\.<\/span>/,
		);
		expect(createdProject.description).toMatch(
			/<span data-number-id="\d+">This is another test\.<\/span>/,
		);
	});

	// 2. 編集後の差分処理
	test("再処理で ID を維持・付与・変更する", async () => {
		const title = "Title";
		const htmlInput = `
			<p>This is a test.</p>
			<p>This is another line.</p>
		`;
		const tagLine = "Tag Line";
		const project = await prisma.project.create({
			data: {
				userId: user.id,
				description: htmlInput,
				title,
				sourceLocale: "en",
			},
		});

		await processProjectHtml(project.id, tagLine, htmlInput, user.id);

		const originalSegments = await prisma.projectSegment.findMany({
			where: { projectId: project.id },
		});
		console.log(originalSegments);
		const idByText = new Map(
			originalSegments.map(({ text, id }) => [text, id]),
		);

		// 改変後
		const editedHtml = `
			<p>This is a line!?</p>
			<p>This is another line.</p>
			<p>new line</p>
		`;

		await processProjectHtml(project.id, tagLine, editedHtml, user.id);

		const editedSegments = await prisma.projectSegment.findMany({
			where: { projectId: project.id },
		});
		const editedIdByText = new Map(
			editedSegments.map(({ text, id }) => [text, id]),
		);

		// 変わらないテキストは同じ ID
		expect(editedIdByText.get("This is another line.")).toBe(
			idByText.get("This is another line."),
		);
		// 変更テキストは新 ID
		expect(editedIdByText.get("This is a line!?")).not.toBe(
			idByText.get("This is a line."),
		);
		// 新規テキストは新 ID
		expect(editedIdByText.get("new line")).toBeDefined();
	});

	// 3. タイトル重複
	test("タイトルと本文が重複しても正しく分割・ID 付与される", async () => {
		const title = "Unique Title";
		const htmlInput = `
			<h1>${title}</h1>
			<p>This is ${title} in a paragraph.</p>
			<p>Another paragraph.</p>
		`;
		const project = await prisma.project.create({
			data: {
				userId: user.id,
				description: htmlInput,
				title,
				sourceLocale: "en",
			},
		});

		await processProjectHtml(project.id, title, htmlInput, user.id);

		const createdProject = await prisma.project.findUnique({
			where: { id: project.id },
			include: { projectSegments: true },
		});
		expect(createdProject).not.toBeNull();
		if (!createdProject) return;

		// title と本文の同一文字列が 2 件存在
		const occurrences = createdProject.projectSegments.filter(
			(seg) => seg.text === title,
		);
		expect(occurrences.length).toBe(2);
		expect(occurrences[0].id).not.toBe(occurrences[1].id);

		// HTML 内でも <h1><span …> と <span …> がある
		expect(createdProject.description).toMatch(
			new RegExp(`<h1><span data-number-id="\\d+">${title}</span></h1>`),
		);
		expect(createdProject.description).toMatch(
			new RegExp(`<span data-number-id="\\d+">${title}</span>`),
		);
	});
	test("無変更で再処理しても ProjectSegment が変わらない", async () => {
		const title = "No Edit";
		const htmlInput = `
			<p>Line A</p>
			<p>Line B</p>
			<p>Line C</p>
		`;

		// ① 初回 Project 作成
		const project = await prisma.project.create({
			data: {
				userId: user.id,
				description: htmlInput,
				title,
				sourceLocale: "en",
			},
		});

		// ②‐1 1 回目の処理
		await processProjectHtml(project.id, title, htmlInput, user.id);
		const firstSegments = await prisma.projectSegment.findMany({
			where: { projectId: project.id },
		});
		const firstMap = new Map(firstSegments.map(({ text, id }) => [text, id]));

		// ②‐2 まったく同じ HTML で 2 回目の処理
		await processProjectHtml(project.id, title, htmlInput, user.id);
		const secondSegments = await prisma.projectSegment.findMany({
			where: { projectId: project.id },
		});
		const secondMap = new Map(secondSegments.map(({ text, id }) => [text, id]));

		// ③ 検証 ― 件数も ID も変わらない
		expect(secondSegments.length).toBe(firstSegments.length);
		firstMap.forEach((id, text) => {
			expect(secondMap.get(text)).toBe(id);
		});
	});

	// 5. 画像 unwrap
	test("<img> が <p> でラップされない", async () => {
		const title = "Image Test";
		const htmlInput = `
			<p>before</p>
			<p><img src="http://localhost/sample.png" alt=""></p>
			<p>after</p>
		`;

		// ① Project 作成
		const project = await prisma.project.create({
			data: {
				userId: user.id,
				description: htmlInput,
				title,
				sourceLocale: "en",
			},
		});

		// ② HTML 処理
		await processProjectHtml(project.id, title, htmlInput, user.id);

		// ③ 検証 ― unwrap されているか
		const updated = await prisma.project.findUnique({
			where: { id: project.id },
		});
		expect(updated).not.toBeNull();
		if (!updated) return;

		// <p><img …></p> という包み込みは無い
		expect(updated.description).not.toMatch(/<p>\s*<img[^>]*>\s*<\/p>/);

		// <img …> 自体は生きている
		expect(updated.description).toMatch(
			/<img [^>]*src="http:\/\/localhost\/sample\.png"[^>]*>/,
		);
	});
});
