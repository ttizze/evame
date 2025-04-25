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

describe("processProjectHtml – title, tagLine保存", () => {
	let user: User;
	beforeEach(async () => {
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

	test("Project.titleが正しく保存されている", async () => {
		const title = "TestTitle保存";
		const htmlInput = "<p>abc</p><p>def</p>";
		const tagLine = "TagLine保存";
		const project = await prisma.project.create({
			data: {
				userId: user.id,
				mdastJson: htmlInput,
				title,
				sourceLocale: "en",
			},
		});
		await processProjectHtml({
			title,
			description: htmlInput,
			tagLine,
			projectId: project.id,
			userId: user.id,
			sourceLocale: "en",
		});
		const createdProject = await prisma.project.findUnique({
			where: { id: project.id },
		});
		expect(createdProject).not.toBeNull();
		if (!createdProject) return;
		expect(createdProject.title).toBe(title);
	});

	test("tagLineがsegment0に保存されている", async () => {
		const title = "TestTitle";
		const htmlInput = "<p>abc</p><p>def</p>";
		const tagLine = "TagLine保存";
		const project = await prisma.project.create({
			data: {
				userId: user.id,
				mdastJson: htmlInput,
				title,
				sourceLocale: "en",
			},
		});
		await processProjectHtml({
			title,
			description: htmlInput,
			tagLine,
			projectId: project.id,
			userId: user.id,
			sourceLocale: "en",
		});
		const createdSegments = await prisma.projectSegment.findMany({
			where: { projectId: project.id },
			orderBy: { number: "asc" },
		});
		expect(createdSegments.length).toBeGreaterThan(0);
		expect(createdSegments[0].text).toBe(tagLine);
	});
});
