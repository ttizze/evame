#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/edit-page-client/service/upsert-page-and-segments";
import { enqueuePageTranslation } from "@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/header/service/enqueue-page-translation.server";
import { db } from "@/db";
import type { PageStatus } from "@/db/types";

type Session = {
	userId: string;
	handle: string;
	plan: string;
};

const SESSION_DIR = path.join(os.homedir(), ".evame");
const SESSION_FILE = path.join(SESSION_DIR, "session.json");

function exitWithError(message: string): never {
	console.error(message);
	process.exit(1);
}

function getArgValue(args: string[], key: string): string | null {
	const index = args.indexOf(`--${key}`);
	if (index === -1) return null;
	if (index + 1 >= args.length) return null;
	return args[index + 1];
}

function requireArg(args: string[], key: string): string {
	const value = getArgValue(args, key);
	if (!value) exitWithError(`--${key} が必要です。`);
	return value;
}

function parseStatus(value: string): PageStatus {
	const normalized = value.toUpperCase();
	if (
		normalized === "DRAFT" ||
		normalized === "PUBLIC" ||
		normalized === "ARCHIVE"
	) {
		return normalized;
	}
	exitWithError(
		"status は DRAFT / PUBLIC / ARCHIVE のいずれかにしてください。",
	);
}

async function readSession(): Promise<Session> {
	if (!existsSync(SESSION_FILE)) {
		exitWithError(
			"未ログインです。先に `evame login --handle <handle>` を実行してください。",
		);
	}
	const raw = await readFile(SESSION_FILE, "utf8");
	return JSON.parse(raw) as Session;
}

async function saveSession(session: Session): Promise<void> {
	await mkdir(SESSION_DIR, { recursive: true });
	await writeFile(SESSION_FILE, JSON.stringify(session, null, 2), "utf8");
}

async function login(args: string[]): Promise<void> {
	const handle = requireArg(args, "handle");
	const user = await db
		.selectFrom("users")
		.select(["id", "handle", "plan"])
		.where("handle", "=", handle)
		.executeTakeFirst();
	if (!user) {
		exitWithError(`ユーザーが見つかりませんでした: ${handle}`);
	}
	await saveSession({ userId: user.id, handle: user.handle, plan: user.plan });
	console.log(`ログインしました: ${user.handle}`);
}

async function logout(): Promise<void> {
	if (existsSync(SESSION_FILE)) {
		await rm(SESSION_FILE);
	}
	console.log("ログアウトしました。");
}

async function upload(args: string[]): Promise<void> {
	const session = await readSession();
	const filePath = requireArg(args, "file");
	const title = requireArg(args, "title");
	const pageSlug = requireArg(args, "slug");
	const sourceLocale = requireArg(args, "source-locale");
	const status = parseStatus(requireArg(args, "status"));
	const targetLocalesRaw = getArgValue(args, "target-locales");
	const targetLocales = targetLocalesRaw
		? targetLocalesRaw
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean)
		: [];

	const markdown = await readFile(filePath, "utf8");
	const { mdastJson, segments } = await markdownToMdastWithSegments({
		header: title,
		markdown,
	});

	const existingPage = await db
		.selectFrom("pages")
		.select(["parentId", "order"])
		.where("slug", "=", pageSlug)
		.where("userId", "=", session.userId)
		.executeTakeFirst();

	const page = await upsertPageAndSegments({
		pageSlug,
		userId: session.userId,
		mdastJson,
		sourceLocale,
		segments,
		segmentTypeId: null,
		parentId: existingPage?.parentId ?? null,
		order: existingPage?.order ?? 0,
		anchorContentId: null,
		status,
	});

	if (status === "PUBLIC" && targetLocales.length > 0) {
		if (session.plan.toLowerCase() !== "premium") {
			exitWithError("翻訳設定はプレミアムプランのみ利用できます。");
		}
		await enqueuePageTranslation({
			currentUserId: session.userId,
			pageId: page.id,
			targetLocales,
			aiModel: "gemini-2.5-flash-lite",
			translationContext: "",
		});
		console.log(`翻訳ジョブを作成しました: ${targetLocales.join(", ")}`);
	}

	console.log(`記事を保存しました: ${page.slug}`);
}

function printUsage(): void {
	console.log(`
evame <command>

Commands:
  login --handle <handle>
  logout
  upload --file <path> --title <title> --slug <slug> --source-locale <locale> --status <DRAFT|PUBLIC|ARCHIVE> [--target-locales ja,en]
`);
}

async function main(): Promise<void> {
	const [, , command, ...args] = process.argv;
	switch (command) {
		case "login":
			await login(args);
			return;
		case "logout":
			await logout();
			return;
		case "upload":
			await upload(args);
			return;
		default:
			printUsage();
			process.exit(command ? 1 : 0);
	}
}

await main();
