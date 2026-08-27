import { describe, expect, it } from "vitest";
import { getLoginCopy } from "./login";

describe("ログイン画面のロケール", () => {
	it("locale指定がない場合は英語を既定にする", () => {
		expect(getLoginCopy()).toMatchObject({ heading: "Sign in" });
	});

	it("URLのlocale指定に応じて日本語へ切り替える", () => {
		expect(getLoginCopy("ja-JP")).toMatchObject({ heading: "ログイン" });
		expect(getLoginCopy("es")).toMatchObject({ heading: "Iniciar sesión" });
		expect(getLoginCopy("ko")).toMatchObject({ heading: "로그인" });
		expect(getLoginCopy("zh")).toMatchObject({ heading: "登录" });
		expect(getLoginCopy("fr")).toMatchObject({ heading: "Sign in" });
	});
});
