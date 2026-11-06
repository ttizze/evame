import { createHash } from "node:crypto";
import { DEFAULT_VIEW, VIEWS } from "../_constants/view";
import { parseReaderRoute } from "./reader-route";

// 読み取り・公開処理で同じキーを使い、長い日本語タグでもR2のキー上限を超えない。
export function readerDocumentKey(path: string) {
	return `html/${createHash("sha256").update(path).digest("hex")}`;
}

// 翻訳選択は全言語の版を含むため、生成元の変更時期は表示言語・表示モードで共用する。
export function readerDocumentSourcePath(path: string) {
	const url = new URL(path, "https://evame.tech");
	const [, locale, ...parts] = url.pathname.split("/");
	if (parts.join("/") === "about")
		return locale === "ja" ? "/about/evame" : "/about/evame-ja";
	url.searchParams.delete("view");
	return `/${parts.join("/")}${url.search}`;
}

export function readerDocumentPath(pathname: string, search: string) {
	const route = parseReaderRoute(pathname, search);
	if (!route || route.kind === "search") return null;
	const parts = [route.locale];
	if (route.kind === "article") parts.push(route.handle, route.pageSlug);
	else if (route.kind === "profile") parts.push(route.handle);
	else if (route.kind === "tag") parts.push("tag", route.tagName);
	else if (route.kind === "new") parts.push("new-pages");
	else if (route.kind !== "home") parts.push(route.kind);
	const params = new URLSearchParams();
	if ("page" in route && route.page !== undefined && route.page > 1)
		params.set("page", String(route.page));
	if (route.kind === "profile" && route.sort === "new")
		params.set("sort", "new");
	const view = new URLSearchParams(search).get("view");
	if (view && view !== DEFAULT_VIEW && VIEWS.some((value) => value === view))
		params.set("view", view);
	const query = params.toString();
	return `/${parts.map(encodeURIComponent).join("/")}${query ? `?${query}` : ""}`;
}
