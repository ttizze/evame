import { expect, it } from "vitest";
import { getHomeMetadata } from "./metadata";

it("ホームはロケール別の文言とルートのcanonical alternateを返す", () => {
	const metadata = getHomeMetadata("ja");
	expect(metadata.title).toBe("Evame — 言葉の壁がないインターネット");
	expect(metadata.description).toContain("母国語で書く。世界が読む。");
	expect(metadata.alternates.canonical).toMatch(/\/ja$/);
	expect(metadata.alternates.languages["x-default"]).toMatch(/\/en$/);
});
